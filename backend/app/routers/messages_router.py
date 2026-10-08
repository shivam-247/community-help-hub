from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Message, ResponseRequest, Post, User, RequestStatus, Role
from ..schemas import MessageIn, MessageOut
from ..auth import get_current_user

from ..product import notify

router = APIRouter(prefix="/requests", tags=["messages"])


def _check_participant(session: Session, rr: ResponseRequest, user: User):
    post = session.get(Post, rr.post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if user.id not in (rr.requester_id, post.owner_id):
        raise HTTPException(status_code=403, detail="You are not part of this conversation.")


@router.get("/{request_id}/messages", response_model=List[MessageOut])
def get_messages(
    request_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session),
):
    rr = session.get(ResponseRequest, request_id)
    if not rr:
        raise HTTPException(status_code=404, detail="Request not found.")
    _check_participant(session, rr, user)
    msgs = session.exec(
        select(Message).where(Message.response_request_id == request_id)
    ).all()
    msgs.sort(key=lambda m: m.created_at)
    out = []
    for m in msgs:
        sender = session.get(User, m.sender_id)
        out.append(MessageOut(
            id=m.id, response_request_id=m.response_request_id, sender_id=m.sender_id,
            sender_name=sender.name, text=m.text, created_at=m.created_at,
        ))
    return out


@router.post("/{request_id}/messages", response_model=MessageOut)
def send_message(
    request_id: int, data: MessageIn,
    user: User = Depends(get_current_user), session: Session = Depends(get_session),
):
    rr = session.get(ResponseRequest, request_id)
    if not rr:
        raise HTTPException(status_code=404, detail="Request not found.")
    _check_participant(session, rr, user)
    if rr.status != RequestStatus.accepted:
        raise HTTPException(status_code=400, detail="Messaging opens only after the request is accepted.")
    msg = Message(response_request_id=request_id, sender_id=user.id, text=data.text)
    session.add(msg)
    post = session.get(Post, rr.post_id)
    recipient = rr.requester_id if user.id == post.owner_id else post.owner_id
    notify(session, recipient, "New private message", f"{user.name} sent you a message about “{post.title}”.", f"/messages/{rr.id}")
    session.commit()
    session.refresh(msg)
    return MessageOut(
        id=msg.id, response_request_id=msg.response_request_id, sender_id=msg.sender_id,
        sender_name=user.name, text=msg.text, created_at=msg.created_at,
    )

