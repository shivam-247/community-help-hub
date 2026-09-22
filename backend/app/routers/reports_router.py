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


@router.get("/admin/reports")
def list_reports(admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    reports = session.exec(select(Report)).all()
    out = []
    for r in reports:
        post = session.get(Post, r.post_id)
        reporter = session.get(User, r.reporter_id)
        out.append({
            "id": r.id, "post_id": r.post_id, "post_title": post.title if post else "(deleted)",
            "reporter_name": reporter.name, "reason": r.reason, "status": r.status,
            "created_at": r.created_at,
        })
    return out


@router.patch("/admin/reports/{report_id}")
def update_report(
    report_id: int, status: ReportStatus,
    admin: User = Depends(require_admin), session: Session = Depends(get_session),
):
    report = session.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    report.status = status
    session.add(report)
    session.commit()
    return {"ok": True}


@router.delete("/admin/posts/{post_id}")
def admin_remove_post(
    post_id: int, admin: User = Depends(require_admin), session: Session = Depends(get_session),
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    session.delete(post)
    session.commit()
    return {"ok": True}
