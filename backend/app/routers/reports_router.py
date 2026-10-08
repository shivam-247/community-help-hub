from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Report, Post, User, ReportStatus
from ..schemas import ReportIn
from ..auth import get_current_user, require_admin

router = APIRouter(tags=["reports"])


@router.post("/posts/{post_id}/report")
def report_post(
    post_id: int, data: ReportIn,
    user: User = Depends(get_current_user), session: Session = Depends(get_session),
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    report = Report(post_id=post_id, reporter_id=user.id, reason=data.reason)
    session.add(report)
    session.commit()
    return {"ok": True}
