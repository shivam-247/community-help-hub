from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import ResponseRequest, Post, User, RequestStatus, badge_for_credits
from ..schemas import ResponseRequestIn, ResponseRequestOut, RequestActionIn
from ..auth import get_current_user

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
    if post.owner_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot respond to your own post.")
    if post.category in ("Help Requests", "Skill Offers") and user.verification_status != "Verified":
        raise HTTPException(
            status_code=403,
            detail="Responding to Help Requests and Skill Offers requires a verified account. "
                   "Submit a verification request from Settings.",
        )
    rr = ResponseRequest(post_id=post_id, requester_id=user.id, message=data.message)
    session.add(rr)
    session.commit()
    session.refresh(rr)
    return _to_out(session, rr)


@router.get("/inbox/incoming", response_model=List[ResponseRequestOut])
def incoming_requests(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    my_posts = session.exec(select(Post).where(Post.owner_id == user.id)).all()
    post_ids = [p.id for p in my_posts]
    if not post_ids:
        return []
    rrs = session.exec(select(ResponseRequest).where(ResponseRequest.post_id.in_(post_ids))).all()
    rrs.sort(key=lambda r: r.created_at, reverse=True)
    return [_to_out(session, r) for r in rrs]


@router.get("/inbox/sent", response_model=List[ResponseRequestOut])
def sent_requests(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rrs = session.exec(select(ResponseRequest).where(ResponseRequest.requester_id == user.id)).all()
    rrs.sort(key=lambda r: r.created_at, reverse=True)
    return [_to_out(session, r) for r in rrs]


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
    if data.action == "accept":
        rr.status = RequestStatus.accepted
    elif data.action == "reject":
        rr.status = RequestStatus.rejected
    else:
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'reject'.")
    session.add(rr)
    session.commit()
    session.refresh(rr)
    return _to_out(session, rr)
