from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response
from ..pagination import PageParams, paginate
from sqlmodel import Session, select

from ..database import get_session
from ..models import ResponseRequest, Post, User, RequestStatus, badge_for_credits
from ..schemas import ResponseRequestIn, ResponseRequestOut, RequestActionIn
from ..auth import get_current_user

from ..product import notify
from ..product_models import CommunityPost, CommunityMember, DemoPost

router = APIRouter(tags=["responses"])


def _to_out(session: Session, rr: ResponseRequest) -> ResponseRequestOut:
    post = session.get(Post, rr.post_id)
    requester = session.get(User, rr.requester_id)
    owner = session.get(User, post.owner_id)
    owner_contact = None
    requester_contact = None
    if rr.status == RequestStatus.accepted:
        if owner.contact_visible and owner.contact_phone:
            owner_contact = owner.contact_phone
        if requester.contact_visible and requester.contact_phone:
            requester_contact = requester.contact_phone
    return ResponseRequestOut(
        id=rr.id, post_id=rr.post_id, post_title=post.title, post_type=post.type,
        requester_id=rr.requester_id, requester_name=requester.name,
        requester_rating=requester.rating_avg, requester_badge=badge_for_credits(requester.credits),
        owner_id=post.owner_id, owner_name=owner.name,
        message=rr.message, status=rr.status, created_at=rr.created_at,
        owner_contact=owner_contact, requester_contact=requester_contact,
    )


@router.post("/posts/{post_id}/respond", response_model=ResponseRequestOut)
def respond_to_post(
    post_id: int, data: ResponseRequestIn,
    user: User = Depends(get_current_user), session: Session = Depends(get_session),
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    board = session.get(CommunityPost, post.id)
    if board and not session.get(CommunityMember, (board.community_id, user.id)):
        raise HTTPException(404, "Post not found.")
    if session.get(DemoPost, post.id):
        raise HTTPException(400, "This is a sample post. Create a real post to arrange an exchange.")
    if post.spam_flag or post.status != "Open":
        raise HTTPException(400, "This post is not accepting responses.")
    if session.exec(select(ResponseRequest).where(ResponseRequest.post_id == post.id, ResponseRequest.requester_id == user.id)).first():
        raise HTTPException(409, "You have already responded to this post. Check your inbox.")
    if post.owner_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot respond to your own post.")
    if post.category in ("Help Requests", "Skill Offers") and user.verification_status != "verified" and user.role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=403,
            detail="Responding to Help Requests and Skill Offers requires a verified account. "
                   "Submit a verification request from Settings.",
        )
    rr = ResponseRequest(post_id=post_id, requester_id=user.id, message=data.message)
    session.add(rr)
    session.flush()
    notify(session, post.owner_id, "New response", f"{user.name} responded to “{post.title}”.", "/inbox")
    session.commit()
    session.refresh(rr)
    return _to_out(session, rr)


@router.get("/inbox/pending-count")
def pending_count(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    from sqlalchemy import func
    return {'count':session.exec(select(func.count(ResponseRequest.id)).join(Post, Post.id == ResponseRequest.post_id).where(Post.owner_id == user.id,ResponseRequest.status == RequestStatus.pending)).one()}

@router.get("/inbox/incoming", response_model=List[ResponseRequestOut])
def incoming_requests(response: Response, paging: PageParams = Depends(), user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    stmt = select(ResponseRequest).join(Post, Post.id == ResponseRequest.post_id).where(Post.owner_id == user.id).order_by(ResponseRequest.created_at.desc(), ResponseRequest.id.desc())
    return [_to_out(session, row) for row in paginate(session, stmt, paging, response)]


@router.get("/inbox/sent", response_model=List[ResponseRequestOut])
def sent_requests(response: Response, paging: PageParams = Depends(), user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    stmt = select(ResponseRequest).where(ResponseRequest.requester_id == user.id).order_by(ResponseRequest.created_at.desc(), ResponseRequest.id.desc())
    return [_to_out(session, row) for row in paginate(session, stmt, paging, response)]


@router.patch("/requests/{request_id}", response_model=ResponseRequestOut)
def act_on_request(
    request_id: int, data: RequestActionIn,
    user: User = Depends(get_current_user), session: Session = Depends(get_session),
):
    rr = session.get(ResponseRequest, request_id)
    if not rr:
        raise HTTPException(status_code=404, detail="Request not found.")
    post = session.get(Post, rr.post_id)
    if post.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the post owner can accept or reject requests.")
    if rr.status != RequestStatus.pending:
        raise HTTPException(409, "This response has already been reviewed.")
    if data.action == "accept":
        other = session.exec(select(ResponseRequest).where(ResponseRequest.post_id == post.id, ResponseRequest.status == RequestStatus.accepted, ResponseRequest.id != rr.id)).first()
        if other:
            raise HTTPException(409, "This post already has an accepted exchange.")
        rr.status = RequestStatus.accepted
    elif data.action == "reject":
        rr.status = RequestStatus.rejected
    else:
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'reject'.")
    session.add(rr)
    session.flush()
    notify(session, rr.requester_id, "Response " + rr.status.value.lower(), f"{user.name} updated your response to “{post.title}”.", f"/messages/{rr.id}" if rr.status == RequestStatus.accepted else "/inbox")
    session.commit()
    session.refresh(rr)
    return _to_out(session, rr)

