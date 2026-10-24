from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Report, Post, User
from ..schemas import ReportIn
from ..auth import get_current_user

router = APIRouter(tags=["reports"])


@router.post("/posts/{post_id}/report")
def report_post(
    post_id: int, data: ReportIn,
    user: User = Depends(get_current_user), session: Session = Depends(get_session),
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    from .posts_router import get_post
    get_post(post_id, session=session, user=user)
    if post.owner_id == user.id:
        raise HTTPException(400, "You cannot report yourself.")
    from ..safety import UserReport
    case = session.exec(select(UserReport).where(UserReport.reporter_id == user.id, UserReport.target_id == post.owner_id, UserReport.status == "Open")).first()
    if not case:
        case = UserReport(reporter_id=user.id, target_id=post.owner_id, post_id=post_id, reason=data.reason)
        session.add(case)
        session.flush()
    report = Report(post_id=post_id, reporter_id=user.id, reason=data.reason)
    session.add(report)
    session.commit()
    return {"ok": True, "case_id": f"USR-{case.id:06d}"}
