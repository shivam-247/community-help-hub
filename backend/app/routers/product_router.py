import asyncio
import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query
from ..pagination import PageParams, paginate
from fastapi.responses import StreamingResponse
from pydantic import Field, field_validator
from sqlalchemy import update, delete
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select
from .. import database
from ..database import get_session
from ..auth import get_current_user, is_admin_or_super, oauth2_scheme
from ..models import User, Post, PostStatus, Message, ResponseRequest, RequestStatus, Verification, VerificationStatus
from ..product_models import *
from pydantic import Field
from ..product import PLANS, active_plan, usage, notify
from ..invoice_receipts import smtp_available
from ..safety import ExchangeClosure, exchange_closed, ensure_chat_open, audit

router = APIRouter(tags=["product"])

@router.get("/plans")
def plans():
    return {"plans": PLANS, "currency": "INR", "mock_checkout": os.getenv("MOCK_CHECKOUT_ENABLED") == "true", "yearly_discount_percent": 20}

@router.get("/billing")
def billing(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    name = active_plan(session, user.id)
    sub = session.get(Subscription, user.id)
    invoices = session.exec(select(Invoice).where(Invoice.user_id == user.id).order_by(Invoice.created_at.desc()).limit(20)).all()
    return {"plan": name, "cycle": sub.cycle if sub else "monthly", "expires_at": sub.expires_at if sub else None,
            "used": usage(session, user.id), "limit": PLANS[name]["posts_per_month"], "invoices": invoices, "mock_checkout": os.getenv("MOCK_CHECKOUT_ENABLED") == "true"}

from ..input_validation import InputModel

class ProductInput(InputModel):
    pass

class CheckoutIn(ProductInput):
    plan: Literal["free", "plus", "society"]
    cycle: Literal["monthly", "yearly"] = "monthly"
    checkout_key: str = Field(min_length=16, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")

@router.post("/billing/checkout")
def checkout(data: CheckoutIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if data.plan != "free" and os.getenv("MOCK_CHECKOUT_ENABLED") != "true":
        raise HTTPException(503, "Checkout is not configured. No payment has been taken.")
    key = f"{user.id}:{data.checkout_key}"
    existing = session.exec(select(Invoice).where(Invoice.checkout_key == key)).first()
    if existing:
        return {"invoice": existing, "duplicate": True}
    amount = PLANS[data.plan][f"{data.cycle}_paise"]
    from ..billing_gateway import get_gateway
    receipt = get_gateway().simulate(user.id, amount, 'INR', data.checkout_key) if data.plan != 'free' else None
    invoice = Invoice(checkout_key=key, user_id=user.id, plan=data.plan, cycle=data.cycle, amount_paise=amount)
    session.add(invoice)
    try:
        session.flush()  # Claim the key before changing entitlements.
    except IntegrityError:
        session.rollback()
        return {"invoice": session.exec(select(Invoice).where(Invoice.checkout_key == key)).one(), "duplicate": True}
    if receipt:
        session.add(PaymentReference(invoice_id=invoice.id, provider=receipt.provider,
                                     reference=receipt.reference, state=receipt.state))
    days = 365 if data.cycle == "yearly" else 30
    session.merge(Subscription(user_id=user.id, plan=data.plan, cycle=data.cycle,
                               expires_at=None if data.plan == "free" else datetime.now(timezone.utc) + timedelta(days=days)))
    from ..invoice_receipts import ensure_receipt
    ensure_receipt(session, invoice, user)
    notify(session, user.id, "Plan updated", f"Your {PLANS[data.plan]['name']} plan is active. Test checkout — no money was charged.", "/settings?tab=billing")
    session.commit()
    session.refresh(invoice)
    return {"invoice": invoice, "duplicate": False}

class PreferencesIn(ProductInput):
    in_app: bool = True
    email_alerts: bool = False

@router.get("/notifications/preferences")
def preferences(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    pref = session.get(NotificationPreference, user.id)
    trust = session.get(TrustRecord, user.id)
    return {"in_app": pref.in_app if pref else True, "email_alerts": pref.email_alerts if pref else False,
            "email_available": smtp_available(),
            "email_verified": bool(trust and trust.email_verified), "plan_allows_email": PLANS[active_plan(session, user.id)]["email_alerts"]}

@router.patch("/notifications/preferences")
def set_preferences(data: PreferencesIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if data.email_alerts and not PLANS[active_plan(session, user.id)]["email_alerts"]:
        raise HTTPException(403, "Email alerts are included with Plus and Society plans.")
    session.merge(NotificationPreference(user_id=user.id, **data.model_dump()))
    session.commit()
    return preferences(user, session)

@router.get("/notifications/unread-count")
def unread_count(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    from sqlalchemy import func
    return {'count':session.exec(select(func.count(Notification.id)).where(Notification.user_id == user.id, Notification.read == False)).one()}

@router.get("/billing/invoices")
def invoices(response: Response, paging: PageParams = Depends(), user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return paginate(session, select(Invoice).where(Invoice.user_id == user.id).order_by(Invoice.id.desc()), paging, response)

def owned_invoice(invoice_id, user, session):
    invoice = session.get(Invoice, invoice_id)
    if not invoice or invoice.user_id != user.id:
        raise HTTPException(404, "Invoice not found.")
    return invoice

@router.get("/billing/invoices/{invoice_id}")
def invoice_detail(invoice_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    from ..invoice_receipts import receipt_payload
    invoice = owned_invoice(invoice_id, user, session)
    return receipt_payload(session, invoice, session.get(InvoiceReceipt, invoice_id), user)

@router.post("/billing/invoices/{invoice_id}/email")
def email_invoice(invoice_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    from ..invoice_receipts import request_email, receipt_payload
    invoice = owned_invoice(invoice_id, user, session)
    row = request_email(session, invoice, session.get(InvoiceReceipt, invoice_id), user)
    session.commit()
    return receipt_payload(session, invoice, row, user)

@router.get("/billing/invoices/{invoice_id}/document")
def invoice_document(invoice_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    from ..invoice_receipts import receipt_html
    from fastapi.responses import HTMLResponse
    invoice = owned_invoice(invoice_id, user, session)
    row = session.get(InvoiceReceipt, invoice_id)
    if not row:
        raise HTTPException(409, "Generate a test receipt from Billing first.")
    return HTMLResponse(receipt_html(invoice,row), headers={
        "Content-Disposition":f'attachment; filename="CHH-{invoice_id:06d}-test-invoice.html"',
        "Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"})

@router.get("/notifications")
def notifications(response: Response, paging: PageParams = Depends(), user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return paginate(session, select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc(), Notification.id.desc()), paging, response)

@router.patch("/notifications/{notification_id}/read")
def read_notification(notification_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    row = session.get(Notification, notification_id)
    if not row or row.user_id != user.id:
        raise HTTPException(404, "Notification not found.")
    row.read = True
    session.add(row)
    session.commit()
    return {"ok": True}

class ProfileIn(ProductInput):
    name: str = Field(min_length=2, max_length=100)
    locality: str = Field(min_length=2, max_length=100)
    contact_phone: str | None = Field(default=None, max_length=20)
    contact_visible: bool = False
    @field_validator("contact_phone")
    @classmethod
    def phone(cls, value):
        if value and not __import__('re').fullmatch(r"(?:\+91[ -]?)?[6-9][0-9]{9}", value):
            raise ValueError("Use a 10-digit Indian mobile number, optionally starting with +91.")
        return value or None

@router.patch("/account/profile")
def profile(data: ProfileIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    from .auth_router import get_or_create_locality, me
    loc = get_or_create_locality(session, data.locality.strip())
    trust = session.get(TrustRecord, user.id)
    area_changed = user.locality_id != loc.id
    if trust:
        if user.contact_phone != data.contact_phone:
            trust.phone_verified = False
        if area_changed:
            trust.address_verified = False
        session.add(trust)
    if area_changed:
        user.verification_status = VerificationStatus.unverified
        for evidence in session.exec(select(Verification).where(Verification.user_id == user.id, Verification.status.in_([VerificationStatus.pending, VerificationStatus.verified]))).all():
            evidence.status = VerificationStatus.rejected
            evidence.reviewer_comment = "Area changed. Submit a new society reference for this neighbourhood."
            session.add(evidence)
    user.name = data.name.strip()
    user.locality_id = loc.id
    user.contact_phone = data.contact_phone
    user.contact_visible = data.contact_visible
    session.add(user)
    session.commit()
    return me(user, session)

@router.get("/account/trust")
def trust_status(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    trust = session.get(TrustRecord, user.id)
    return {"email": bool(trust and trust.email_verified), "phone": bool(trust and trust.phone_verified),
            "community": bool(trust and trust.address_verified), "status": user.verification_status,
            "email_delivery_available": smtp_available(),
            "email_saved": user.email, "phone_saved": bool(user.contact_phone),
            "community_saved": bool(user.locality_id), "staff_access": is_admin_or_super(user),
            "phone_method": "Administrator review of your society reference; no SMS service is configured."}

def code_digest(user_id, code):
    return hmac.new(os.environ["JWT_SECRET_KEY"].encode(), f"{user_id}:{code}".encode(), hashlib.sha256).hexdigest()

@router.post("/account/email/send")
def send_code(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not smtp_available():
        raise HTTPException(503, "Email delivery is not configured yet. You can still submit a society reference for community review.")
    old = session.get(EmailChallenge, user.id)
    if old and old.expires_at > int(time.time()) + 540:
        raise HTTPException(429, "Wait one minute before requesting another code.")
    code = f"{secrets.randbelow(1_000_000):06d}"
    session.merge(EmailChallenge(user_id=user.id, digest=code_digest(user.id, code), expires_at=int(time.time()) + 600))
    session.add(EmailOutbox(user_id=user.id, subject="Your Community Help Hub verification code", body=f"Your code is {code}. It expires in 10 minutes. Never share it with anyone."))
    session.commit()
    return {"ok": True}

class CodeIn(ProductInput):
    code: str = Field(pattern=r"^\d{6}$")

@router.post("/account/email/verify")
def verify_code(data: CodeIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    row = session.get(EmailChallenge, user.id)
    if not row or row.expires_at < time.time() or row.attempts >= 5:
        raise HTTPException(400, "Request a fresh verification code.")
    row.attempts += 1
    valid = hmac.compare_digest(row.digest, code_digest(user.id, data.code))
    session.add(row)
    if valid:
        trust = session.get(TrustRecord, user.id) or TrustRecord(user_id=user.id)
        trust.email_verified = True
        from ..invoice_receipts import release_verified_receipts
        release_verified_receipts(session, user.id)
        session.add(trust)
        session.delete(row)
    session.commit()
    if not valid:
        raise HTTPException(400, "Incorrect verification code.")
    return {"ok": True}

@router.post("/requests/{request_id}/complete")
def complete(request_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rr = session.get(ResponseRequest, request_id)
    post = session.get(Post, rr.post_id) if rr else None
    if not post or user.id not in (post.owner_id, rr.requester_id) or rr.status != RequestStatus.accepted:
        raise HTTPException(403, "Only the two participants of an accepted exchange can confirm completion.")
    from .messages_router import _check_participant
    _check_participant(session, rr, user)
    # Serialize message writes and completion claims on SQLite before checking closure.
    session.execute(update(Post).where(Post.id == post.id).values(status=Post.status))
    session.expire_all()
    if exchange_closed(session, rr):
        session.exec(delete(Message).where(Message.response_request_id == rr.id))
        if not session.get(ExchangeClosure, rr.id):
            session.add(ExchangeClosure(request_id=rr.id, post_id=post.id))
        session.commit()
        return {"completed": True, "confirmed": True, "chat_closed": True}
    try:
        with session.begin_nested():
            if not session.get(CompletionConfirmation, (post.id, user.id)):
                session.add(CompletionConfirmation(post_id=post.id, user_id=user.id))
                session.flush()
    except IntegrityError:
        pass
    participants = (post.owner_id, rr.requester_id)
    done = all(session.get(CompletionConfirmation, (post.id, uid)) for uid in participants)
    if done:
        # Lock claims and credit both parties once, even after repeated confirmation.
        for uid in participants:
            try:
                with session.begin_nested():
                    session.add(CreditEvent(exchange_key=f"{post.id}:{post.created_at.isoformat()}", post_id=post.id, user_id=uid))
                    session.flush()
                    session.execute(update(User).where(User.id == uid).values(credits=User.credits + 10))
                    notify(session, uid, "Exchange completed", "Thank you for helping your neighbourhood. You earned 10 community credits.", f"/post/{post.id}")
            except IntegrityError:
                pass
        post.status = PostStatus.resolved
        session.add(post)
        session.add(ExchangeClosure(request_id=rr.id, post_id=post.id))
        session.exec(delete(Message).where(Message.response_request_id == rr.id))
    else:
        notify(session, rr.requester_id if user.id == post.owner_id else post.owner_id,
               "Please confirm your exchange", f"{user.name} marked “{post.title}” as completed. Confirm in your conversation when the exchange is done.", f"/messages/{rr.id}")
    session.commit()
    return {"completed": done, "confirmed": True, "chat_closed": done}

@router.get("/requests/{request_id}/state")
def exchange_state(request_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    from .messages_router import _check_participant
    rr = session.get(ResponseRequest, request_id)
    if not rr:
        raise HTTPException(404, "Conversation not found.")
    _check_participant(session, rr, user)
    post = session.get(Post, rr.post_id)
    return {"closed": exchange_closed(session, rr), "post_id": post.id,
            "confirmed": bool(session.get(CompletionConfirmation, (post.id, user.id))),
            "peer_id": rr.requester_id if user.id == post.owner_id else post.owner_id}

@router.get("/requests/{request_id}/events")
def message_events(request_id: int, request: Request, after: int = 0,
                   user: User = Depends(get_current_user), token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    from .messages_router import _check_participant
    rr = session.get(ResponseRequest, request_id)
    if not rr:
        raise HTTPException(404, "Conversation not found.")
    _check_participant(session, rr, user)
    ensure_chat_open(session, rr)
    async def stream():
        try:
            resume = int(request.headers.get("last-event-id", "0"))
        except ValueError:
            resume = 0
        last = max(after, resume, 0)
        until = time.monotonic() + 45
        while time.monotonic() < until and not await request.is_disconnected():
            with Session(database.engine) as fresh:
                try:
                    current = get_current_user(token=token, session=fresh)
                    conversation = fresh.get(ResponseRequest, request_id)
                    if not conversation or conversation.status != RequestStatus.accepted:
                        return
                    _check_participant(fresh, conversation, current)
                    if exchange_closed(fresh, conversation):
                        yield 'event: exchange_closed\ndata: {"closed": true}\n\n'
                        return
                except HTTPException:
                    return
                rows = fresh.exec(select(Message).where(Message.response_request_id == request_id, Message.id > last).order_by(Message.id).limit(100)).all()
                for row in rows:
                    sender = fresh.get(User, row.sender_id)
                    payload = {"id": row.id, "response_request_id": request_id, "sender_id": row.sender_id, "sender_name": sender.name, "text": row.text, "created_at": row.created_at.isoformat()}
                    last = row.id
                    yield f"id: {last}\ndata: {json.dumps(payload)}\n\n"
            yield ": heartbeat\n\n"
            await asyncio.sleep(1)
    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})

class CommunityIn(ProductInput):
    name: str = Field(min_length=3, max_length=100)
    pin_code: str = Field(pattern=r"^[1-9][0-9]{5}$")

@router.get("/communities")
def communities(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    memberships = session.exec(select(CommunityMember).where(CommunityMember.user_id == user.id).order_by(CommunityMember.community_id).limit(50)).all()
    out = []
    for m in memberships:
        board = session.get(Community, m.community_id)
        out.append({"id": board.id, "name": board.name, "pin_code": board.pin_code, "owner_id": board.owner_id,
                    "invite_code": board.invite_code if board.owner_id == user.id else None})
    return out

@router.post("/communities")
def create_community(data: CommunityIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if active_plan(session, user.id) != "society":
        raise HTTPException(403, "Society plan required to create a community board.")
    if session.exec(select(Community).where(Community.owner_id == user.id)).first():
        raise HTTPException(409, "Your plan includes one society board.")
    board = Community(owner_id=user.id, name=data.name.strip(), pin_code=data.pin_code, invite_code=secrets.token_urlsafe(18))
    session.add(board)
    session.flush()
    session.add(CommunityMember(community_id=board.id, user_id=user.id))
    session.commit()
    return communities(user, session)

class JoinIn(ProductInput):
    invite_code: str = Field(min_length=16, max_length=100)

@router.post("/communities/join")
def join(data: JoinIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    board = session.exec(select(Community).where(Community.invite_code == data.invite_code)).first()
    if not board or active_plan(session, board.owner_id) != "society":
        raise HTTPException(404, "This invite is unavailable.")
    session.merge(CommunityMember(community_id=board.id, user_id=user.id))
    session.commit()
    return communities(user, session)

@router.get("/communities/{community_id}/analytics")
def analytics(community_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    board = session.get(Community, community_id)
    if not board or board.owner_id != user.id or active_plan(session, user.id) != "society":
        raise HTTPException(403, "Only the society administrator on an active Society plan can view analytics.")
    from sqlalchemy import func
    members = session.exec(select(func.count()).select_from(CommunityMember).where(CommunityMember.community_id == community_id)).one()
    base = select(func.count(Post.id)).join(CommunityPost,CommunityPost.post_id==Post.id).where(CommunityPost.community_id==community_id)
    return {'members':members,'posts':session.exec(base).one(),'completed':session.exec(base.where(Post.status==PostStatus.resolved)).one()}

@router.patch("/admin/posts/{post_id}/spam")
def moderate_spam(post_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not is_admin_or_super(user):
        raise HTTPException(403, "Administrator access required.")
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post not found.")
    post.spam_flag = False
    session.add(post)
    notify(session, post.owner_id, "Post approved", "Your post has passed the community moderation review.", f"/post/{post.id}")
    session.commit()
    return {"ok": True}

class TrustReviewIn(ProductInput):
    phone_verified: bool = False
    address_verified: bool = False
    note: str = Field(min_length=10, max_length=1000)

@router.patch("/admin/users/{user_id}/trust")
def review_trust(user_id: int, data: TrustReviewIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not is_admin_or_super(user) or user_id == user.id:
        raise HTTPException(403, "An independent administrator must review this evidence.")
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(404, "User not found.")
    if data.phone_verified and not target.contact_phone:
        raise HTTPException(422, "This member has not supplied a phone number.")
    evidence = session.exec(select(Verification).where(Verification.user_id == user_id, Verification.status == VerificationStatus.verified)).first()
    if not evidence:
        raise HTTPException(422, "Approve the member's submitted evidence before confirming trust steps.")
    trust = session.get(TrustRecord, user_id) or TrustRecord(user_id=user_id)
    trust.phone_verified = data.phone_verified
    trust.address_verified = data.address_verified
    audit(session, user, user_id, "trust_review", data.note)
    session.add(trust)
    session.add(Verification(user_id=user_id, proof_type="Trust review", proof_value=data.note, status=VerificationStatus.verified, reviewer_id=user.id, reviewed_at=datetime.now(timezone.utc)))
    notify(session, user_id, "Trust steps updated", "A community administrator has reviewed your society reference.", "/settings?tab=trust")
    session.commit()
    return {"ok": True}

@router.get("/communities/{community_id}/feed")
@router.get("/communities/{community_id}/posts")
def community_posts(community_id: int, response: Response, request: Request,
    locality: str | None = Query(None, max_length=200), category: str | None = Query(None,max_length=100),
    type: str | None = Query(None,max_length=50), priority: str | None = Query(None,max_length=20),
    q: str | None = Query(None,max_length=200), verified_only: bool = False,
    sort: Literal['newest','deadline'] = 'newest', paging: PageParams = Depends(),
    user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    from ..feed import feed_statement, feed_page
    from .posts_router import _to_out
    stmt = feed_statement(session, user, community_id, locality, category, type, priority, q, verified_only, sort)
    if request.url.path.endswith('/feed'):
        return feed_page(session, stmt, paging)
    return [_to_out(session, p) for p in paginate(session, stmt, paging, response)]
