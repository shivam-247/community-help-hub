from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import User, Post, Verification, VerificationStatus, Report, ReportStatus, Role, badge_for_credits, Locality
from ..schemas import UserRoleUpdateIn
from ..auth import require_admin, require_super_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def get_admin_stats(admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    total_users = len(session.exec(select(User)).all())
    total_posts = len(session.exec(select(Post)).all())
    pending_verifications = len(
        session.exec(select(Verification).where(Verification.status == VerificationStatus.pending)).all()
    )
    open_reports = len(
        session.exec(select(Report).where(Report.status == ReportStatus.open)).all()
    )
    return {
        "total_users": total_users,
        "total_posts": total_posts,
        "pending_verifications": pending_verifications,
        "open_reports": open_reports,
    }


@router.get("/users")
def list_all_users(admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    users = session.exec(select(User).order_by(User.id)).all()
    result = []
    for u in users:
        loc = session.get(Locality, u.locality_id) if u.locality_id else None
        result.append({
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

    target.role = Role(data.role)
    session.add(target)
    session.commit()
    session.refresh(target)
    return {"ok": True, "id": target.id, "role": target.role}


@router.get("/posts")
def list_all_posts(admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    posts = session.exec(select(Post).order_by(Post.created_at.desc())).all()
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
    session.delete(post)
    session.commit()
    return {"ok": True, "deleted_post_id": post_id}
