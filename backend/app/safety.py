"""Exchange closure and moderation records; additive tables preserve existing data."""
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, select
from fastapi import HTTPException
from .models import Post, ResponseRequest, User, RequestStatus


def now():
    return datetime.now(timezone.utc)


class ExchangeClosure(SQLModel, table=True):
    request_id: int = Field(primary_key=True)
    post_id: int = Field(index=True)
    closed_at: datetime = Field(default_factory=now)


class AccountRestriction(SQLModel, table=True):
    user_id: int = Field(primary_key=True, foreign_key="user.id")
    state: str = "active"
    reason: str = ""
    updated_at: datetime = Field(default_factory=now)


class UserReport(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    reporter_id: int = Field(foreign_key="user.id", index=True)
    target_id: int = Field(foreign_key="user.id", index=True)
    request_id: Optional[int] = None
    post_id: Optional[int] = None
    reason: str
    status: str = "Open"
    reviewer_note: str = ""
    reviewed_by: Optional[int] = None
    created_at: datetime = Field(default_factory=now)


class ModerationEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    actor_id: int = Field(foreign_key="user.id")
    target_id: int = Field(foreign_key="user.id")
    action: str
    note: str
    created_at: datetime = Field(default_factory=now)


def audit(session, actor, target_id, action, note):
    session.add(ModerationEvent(actor_id=actor.id, target_id=target_id, action=action, note=note))


def exchange_closed(session, rr):
    if session.get(ExchangeClosure, rr.id):
        return True
    # Protect exchanges completed before the closure table was introduced.
    from .product_models import CompletionConfirmation
    post = session.get(Post, rr.post_id)
    return bool(post and all(session.get(CompletionConfirmation, (post.id, uid))
                            for uid in (post.owner_id, rr.requester_id)))


def ensure_chat_open(session, rr):
    if exchange_closed(session, rr):
        raise HTTPException(410, "Exchange completed. This conversation is closed and its messages are no longer available.")
    if rr.status != RequestStatus.accepted:
        raise HTTPException(403, "Chat opens after acceptance.")


def restriction(session, user_id):
    row = session.get(AccountRestriction, user_id)
    return row.state if row else "active"


def purge_completed_chats(engine):
    """Backfill closure for existing mutually confirmed exchanges, without awarding credits."""
    from sqlalchemy import delete
    from sqlmodel import Session
    from .models import Message
    from .product_models import CompletionConfirmation
    with Session(engine) as session:
        rows = session.exec(select(ResponseRequest).join(Post, Post.id == ResponseRequest.post_id).where(
            ResponseRequest.status == RequestStatus.accepted,
            select(CompletionConfirmation.user_id).where(CompletionConfirmation.post_id == Post.id, CompletionConfirmation.user_id == Post.owner_id).exists(),
            select(CompletionConfirmation.user_id).where(CompletionConfirmation.post_id == Post.id, CompletionConfirmation.user_id == ResponseRequest.requester_id).exists(),
        )).all()
        for rr in rows:
            if not session.get(ExchangeClosure, rr.id):
                session.add(ExchangeClosure(request_id=rr.id, post_id=rr.post_id))
            session.exec(delete(Message).where(Message.response_request_id == rr.id))
        session.commit()
