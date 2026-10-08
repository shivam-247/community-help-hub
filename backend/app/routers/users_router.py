import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..database import get_session
from ..models import User, Locality, Post, Rating, badge_for_credits, PostStatus

router = APIRouter(prefix="/users", tags=["users"])


class ReviewOut(BaseModel):
    id: int
    rater_name: str
    rater_badge: str
    stars: int
    tags: List[str]
    comment: Optional[str] = None
    created_at: datetime


class UserProfileOut(BaseModel):
    id: int
    name: str
    locality: Optional[str] = None
    rating_avg: float
    rating_count: int
    credits: int
    badge: str
    avatar: Optional[str] = "avatar-1"
    role: Optional[str] = "user"
    verification_status: str
    created_at: datetime
    active_posts: List[dict] = []
    reviews: List[ReviewOut] = []


@router.get("/{user_id}", response_model=UserProfileOut)
def get_user_profile(user_id: int, session: Session = Depends(get_session)):
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    loc = session.get(Locality, target_user.locality_id) if target_user.locality_id else None

    # Fetch active posts by this user
    posts = session.exec(
        select(Post)
        .where(Post.owner_id == target_user.id)
        .order_by(Post.created_at.desc())
    ).all()

    from ..product_models import CommunityPost
    private_ids = set(session.exec(select(CommunityPost.post_id)).all())
    posts = [p for p in posts if p.id not in private_ids and not p.spam_flag]
    active_posts_data = [
        {
            "id": p.id,
            "title": p.title,
            "type": p.type,
            "category": p.category,
            "status": p.status,
            "priority": p.priority,
            "created_at": p.created_at.isoformat(),
        }
        for p in posts
    ]

    # Fetch reviews received by this user
    ratings = session.exec(
        select(Rating)
        .where(Rating.rated_user_id == target_user.id)
        .order_by(Rating.created_at.desc())
    ).all()

    reviews_data = []
    for r in ratings:
        if r.post_id in private_ids:
            continue
        rater = session.get(User, r.rater_id)
        rater_name = rater.name if rater else "Neighbor"
        rater_badge = badge_for_credits(rater.credits) if rater else "Newcomer"
        try:
            tags = json.loads(r.tags) if r.tags else []
        except Exception:
            tags = []
        reviews_data.append(
            ReviewOut(
                id=r.id,
                rater_name=rater_name,
                rater_badge=rater_badge,
                stars=r.stars,
                tags=tags,
                comment=r.comment,
                created_at=r.created_at,
            )
        )

    return UserProfileOut(
        id=target_user.id,
        name=target_user.name,
        locality=loc.name if loc else "Neighborhood",
        rating_avg=target_user.rating_avg,
        rating_count=target_user.rating_count,
        credits=target_user.credits,
        badge=badge_for_credits(target_user.credits),
        avatar=getattr(target_user, "avatar", "avatar-1") or "avatar-1",
        role=target_user.role,
        verification_status=target_user.verification_status,
        created_at=target_user.created_at,
        active_posts=active_posts_data,
        reviews=reviews_data,
    )

