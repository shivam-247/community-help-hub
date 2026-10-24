from fastapi import APIRouter, Depends, HTTPException, Response
from ..pagination import PageParams, paginate
from sqlmodel import Session, select
from sqlalchemy import func

from ..database import get_session
from ..models import User, Post, Verification, VerificationStatus, Report, ReportStatus, Role, badge_for_credits, Locality
from ..schemas import UserRoleUpdateIn, ReportUpdateIn
from ..post_operations import delete_post_records
from ..auth import require_admin, require_super_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def get_admin_stats(admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    total_users = session.exec(select(func.count(User.id))).one()
    total_posts = session.exec(select(func.count(Post.id))).one()
    pending_verifications = session.exec(select(func.count(Verification.id)).where(Verification.status == VerificationStatus.pending)).one()
    open_reports = session.exec(select(func.count(Report.id)).where(Report.status == ReportStatus.open)).one()
    return {
        "total_users": total_users,
        "total_posts": total_posts,
        "pending_verifications": pending_verifications,
        "open_reports": open_reports,
    }


@router.get("/users")
def list_all_users(response: Response, paging: PageParams = Depends(), admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    from ..product import active_plan
    from ..product_models import TrustRecord
    from ..safety import restriction
    users = paginate(session, select(User).order_by(User.id), paging, response)
    result = []
    for u in users:
        loc = session.get(Locality, u.locality_id) if u.locality_id else None
        result.append({
            "plan": active_plan(session, u.id),
            "account_state": restriction(session, u.id),
            "contact_phone": u.contact_phone,
            "phone_verified": bool(session.get(TrustRecord, u.id) and session.get(TrustRecord, u.id).phone_verified),
            "address_verified": bool(session.get(TrustRecord, u.id) and session.get(TrustRecord, u.id).address_verified),
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "credits": u.credits,
            "badge": badge_for_credits(u.credits),
            "locality": loc.name if loc else "Not set",
            "verification_status": u.verification_status,
            "avatar": getattr(u, "avatar", "avatar-1") or "avatar-1",
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return result


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    data: UserRoleUpdateIn,
    super_admin: User = Depends(require_super_admin),
    session: Session = Depends(get_session),
):
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    valid_roles = [r.value for r in Role]
    if data.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{data.role}'. Must be one of: {', '.join(valid_roles)}",
        )

    # Protect against demoting oneself if the last super_admin
    if target.id == super_admin.id and data.role != Role.super_admin.value:
        raise HTTPException(status_code=400, detail="Cannot demote your own Super Admin account.")

    from ..safety import audit, restriction
    if restriction(session, target.id) != "active":
        raise HTTPException(409, "Restore this account before changing its role.")
    audit(session, super_admin, target.id, "role_changed", f"{target.role.value} to {data.role}")
    target.role = Role(data.role)
    session.add(target)
    session.commit()
    session.refresh(target)
    return {"ok": True, "id": target.id, "role": target.role}


@router.get("/posts")
def list_all_posts(spam_only: bool = False, response: Response = None, paging: PageParams = Depends(), admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    posts = paginate(session, select(Post).where(Post.spam_flag == True if spam_only else True).order_by(Post.created_at.desc(), Post.id.desc()), paging, response)
    result = []
    for p in posts:
        owner = session.get(User, p.owner_id)
        loc = session.get(Locality, p.locality_id) if p.locality_id else None
        result.append({
            "id": p.id,
            "title": p.title,
            "type": p.type,
            "category": p.category,
            "priority": p.priority,
            "status": p.status,
            "locality": loc.name if loc else "Unknown",
            "owner_id": p.owner_id,
            "owner_name": owner.name if owner else "Unknown",
            "owner_email": owner.email if owner else "Unknown",
            "spam_score": p.spam_score,
            "spam_flag": p.spam_flag,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return result


@router.delete("/posts/{post_id}")
def admin_delete_post(
    post_id: int,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    delete_post_records(session, post)
    session.commit()
    return {"ok": True, "deleted_post_id": post_id}


@router.get("/reports")
def list_reports(response: Response, paging: PageParams = Depends(), admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    rows = paginate(session, select(Report, Post, User).join(Post, Report.post_id == Post.id)
        .join(User, Report.reporter_id == User.id).order_by(Report.created_at.desc(), Report.id.desc()), paging, response)
    return [{"id": report.id, "post_id": post.id, "post_title": post.title,
        "reporter_id": reporter.id, "reporter_name": reporter.name,
        "reason": report.reason, "status": report.status, "created_at": report.created_at}
        for report, post, reporter in rows]


@router.patch("/reports/{report_id}")
def update_report(report_id: int, data: ReportUpdateIn,
    admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    report = session.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    report.status = data.status
    session.add(report)
    session.commit()
    return {"ok": True, "id": report.id, "status": report.status}

