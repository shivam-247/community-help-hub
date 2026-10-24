"""Report cases and explicitly audited staff actions. No government ID collection."""
from datetime import datetime, timedelta, timezone
from typing import Literal
import secrets
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import Field
from sqlalchemy import delete
from sqlmodel import Session, select
from ..auth import get_current_user, require_admin, require_super_admin, hash_password
from ..database import get_session
from ..input_validation import InputModel
from ..models import User, Post, PostStatus, RequestStatus, ResponseRequest, Verification, UserAuthVersion, UserMFA
from ..product_models import Subscription, TrustRecord, Invoice
from ..product import active_plan, notify
from ..pagination import PageParams, paginate
from ..safety import UserReport, AccountRestriction, ModerationEvent, ExchangeClosure, audit, restriction

router = APIRouter(tags=["safety"])


class ReportUserIn(InputModel):
    reason: str = Field(min_length=10, max_length=2000)
    request_id: int | None = Field(default=None, gt=0)
    post_id: int | None = Field(default=None, gt=0)


@router.post("/users/{user_id}/report")
def report_user(user_id: int, data: ReportUserIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(404, "User not found.")
    if user_id == user.id:
        raise HTTPException(400, "You cannot report yourself.")
    if data.request_id:
        from .messages_router import _check_participant
        rr = session.get(ResponseRequest, data.request_id)
        if not rr:
            raise HTTPException(404, "Conversation not found.")
        _check_participant(session, rr, user)
        post = session.get(Post, rr.post_id)
        if user_id not in (post.owner_id, rr.requester_id):
            raise HTTPException(400, "This user is not part of the conversation.")
    if data.post_id:
        from .posts_router import get_post
        post = get_post(data.post_id, session=session, user=user)
        if post.owner_id != user_id:
            raise HTTPException(400, "The report must identify the post author.")
    old = session.exec(select(UserReport).where(UserReport.reporter_id == user.id, UserReport.target_id == user_id, UserReport.status == "Open")).first()
    if old:
        return {"ok": True, "case_id": f"USR-{old.id:06d}", "duplicate": True}
    row = UserReport(reporter_id=user.id, target_id=user_id, **data.model_dump())
    session.add(row)
    session.flush()
    notify(session, user.id, "Safety report received", f"Your case reference is USR-{row.id:06d}. An administrator will review it.", "/settings?tab=security")
    session.commit()
    return {"ok": True, "case_id": f"USR-{row.id:06d}", "duplicate": False}


@router.get("/admin/user-reports")
def user_reports(response: Response, paging: PageParams = Depends(), admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    rows = paginate(session, select(UserReport).order_by(UserReport.id.desc()), paging, response)
    out = []
    for row in rows:
        target, reporter = session.get(User, row.target_id), session.get(User, row.reporter_id)
        out.append({**row.model_dump(), "case_id": f"USR-{row.id:06d}",
                    "target_name": target.name, "reporter_name": reporter.name,
                    "account_state": restriction(session, row.target_id)})
    return out


class CaseReviewIn(InputModel):
    status: Literal["Reviewed", "Actioned"]
    note: str = Field(min_length=10, max_length=1000)


@router.patch("/admin/user-reports/{case_id}")
def review_case(case_id: int, data: CaseReviewIn, admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    row = session.get(UserReport, case_id)
    if not row:
        raise HTTPException(404, "Report not found.")
    if admin.id in (row.reporter_id, row.target_id):
        raise HTTPException(403, "An independent moderator must review this case.")
    row.status, row.reviewer_note, row.reviewed_by = data.status, data.note, admin.id
    session.add(row)
    audit(session, admin, row.target_id, "report_" + data.status.lower(), f"USR-{row.id:06d}: {data.note}")
    notify(session, row.reporter_id, "Safety report reviewed", f"Case USR-{row.id:06d} is {data.status.lower()}. Thank you for reporting your concern.", "/settings?tab=security")
    session.commit()
    return {"ok": True}


class RestrictionIn(InputModel):
    state: Literal["active", "suspended"]
    note: str = Field(min_length=10, max_length=1000)


def manageable(session, user_id, admin):
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(404, "User not found.")
    if user_id == admin.id or target.role == "super_admin" or (admin.role != "super_admin" and target.role != "user"):
        raise HTTPException(403, "You cannot restrict yourself or a protected staff account.")
    return target


@router.patch("/admin/users/{user_id}/restriction")
def restrict_user(user_id: int, data: RestrictionIn, admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    manageable(session, user_id, admin)
    if restriction(session, user_id) == "deleted":
        raise HTTPException(409, "A deleted account cannot be reactivated.")
    session.merge(AccountRestriction(user_id=user_id, state=data.state, reason=data.note))
    session.merge(UserAuthVersion(user_id=user_id, version=secrets.token_urlsafe(24)))
    audit(session, admin, user_id, "account_" + data.state, data.note)
    session.commit()
    return {"ok": True, "state": data.state}


class DeleteAccountIn(InputModel):
    note: str = Field(min_length=10, max_length=1000)
    confirmation: Literal["DELETE"]


@router.post("/admin/users/{user_id}/delete")
def delete_account(user_id: int, data: DeleteAccountIn, admin: User = Depends(require_super_admin), session: Session = Depends(get_session)):
    target = manageable(session, user_id, admin)
    from ..post_operations import delete_post_records
    from ..models import Message
    from ..product_models import EmailOutbox, EmailChallenge, NotificationPreference, InvoiceReceipt
    # Case IDs and moderation records remain. Remove public content and personal profile data.
    for post in session.exec(select(Post).where(Post.owner_id == user_id)).all():
        delete_post_records(session, post)
    for rr in session.exec(select(ResponseRequest).where(ResponseRequest.requester_id == user_id)).all():
        session.exec(delete(Message).where(Message.response_request_id == rr.id))
        rr.message = "Member removed"
        if rr.status == RequestStatus.accepted:
            notice = session.get(Post, rr.post_id)
            if notice:
                notice.status = PostStatus.resolved
                session.add(notice)
        rr.status = RequestStatus.rejected
        session.add(rr)
        if not session.get(ExchangeClosure, rr.id):
            session.add(ExchangeClosure(request_id=rr.id, post_id=rr.post_id))
    session.exec(delete(Verification).where(Verification.user_id == user_id))
    session.exec(delete(TrustRecord).where(TrustRecord.user_id == user_id))
    session.exec(delete(UserMFA).where(UserMFA.user_id == user_id))
    session.exec(delete(EmailChallenge).where(EmailChallenge.user_id == user_id))
    from ..password_recovery import PasswordResetChallenge
    session.exec(delete(PasswordResetChallenge).where(PasswordResetChallenge.user_id == user_id))
    for row in session.exec(select(EmailOutbox).where(EmailOutbox.user_id == user_id)).all():
        row.body, row.subject, row.status = "Removed", "Removed", "cancelled"
        session.add(row)
    for row in session.exec(select(InvoiceReceipt).join(Invoice).where(Invoice.user_id == user_id)).all():
        row.recipient_name, row.recipient_email = "Deleted member", f"deleted-{user_id}@example.invalid"
        session.add(row)
    target.name, target.email = "Deleted member", f"deleted-{user_id}-{secrets.token_hex(8)}@example.invalid"
    target.hashed_password = hash_password(secrets.token_urlsafe(48))
    target.contact_phone, target.contact_visible, target.avatar, target.locality_id = None, False, "initials", None
    target.verification_status = "unverified"
    session.add(target)
    session.merge(AccountRestriction(user_id=user_id, state="deleted", reason=data.note))
    session.merge(UserAuthVersion(user_id=user_id, version=secrets.token_urlsafe(24)))
    session.merge(Subscription(user_id=user_id, plan="free"))
    audit(session, admin, user_id, "account_deleted", data.note)
    session.commit()
    return {"ok": True, "state": "deleted", "retention": "Minimal exchange, billing and moderation case records remain; profile data and public posts removed."}


class PlanOverrideIn(InputModel):
    plan: Literal["free", "plus", "society"]
    days: int = Field(default=30, ge=1, le=366)
    note: str = Field(min_length=10, max_length=1000)


@router.patch("/admin/users/{user_id}/plan")
def change_plan(user_id: int, data: PlanOverrideIn, admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    if not session.get(User, user_id):
        raise HTTPException(404, "User not found.")
    if restriction(session, user_id) != "active":
        raise HTTPException(409, "Restore this account before assigning a plan.")
    # This is a staff grant, never a payment or a paid invoice.
    session.merge(Subscription(user_id=user_id, plan=data.plan, cycle="monthly",
        expires_at=None if data.plan == "free" else datetime.now(timezone.utc) + timedelta(days=data.days)))
    audit(session, admin, user_id, "plan_changed", f"{data.plan}, {data.days} days. {data.note}")
    notify(session, user_id, "Plan updated by an administrator", f"Your plan is now {data.plan}. This is an administrator grant; no payment was taken.", "/settings?tab=billing")
    session.commit()
    return {"ok": True, "plan": active_plan(session, user_id)}


@router.get("/admin/activity")
def activity(response: Response, paging: PageParams = Depends(), admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    return paginate(session, select(ModerationEvent).order_by(ModerationEvent.id.desc()), paging, response)
