import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Response
from ..pagination import PageParams, paginate
from pydantic import BaseModel
from sqlmodel import Session, select

from ..database import get_session
from ..product_models import CommunityPost
from ..product import active_plan
from ..models import User, Locality, Post, Rating, badge_for_credits

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
    is_demo: bool = False
    plan: str = "free"
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
    from ..safety import restriction
    if not target_user or restriction(session, user_id) != "active":
        raise HTTPException(status_code=404, detail="User not found.")

    loc = session.get(Locality, target_user.locality_id) if target_user.locality_id else None

    # Fetch active posts by this user
    posts = session.exec(
        select(Post)
        .where(Post.owner_id == target_user.id)
        .where(~select(CommunityPost.post_id).where(CommunityPost.post_id == Post.id).exists(), Post.spam_flag == False)
        .order_by(Post.created_at.desc(), Post.id.desc()).limit(20)
    ).all()

    private_ids = set(session.exec(select(CommunityPost.post_id).where(CommunityPost.post_id.in_([p.id for p in posts]))).all())
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
        .where(~select(CommunityPost.post_id).where(CommunityPost.post_id == Rating.post_id).exists())
        .order_by(Rating.created_at.desc(), Rating.id.desc()).limit(20)
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
        plan=active_plan(session, target_user.id),
        is_demo=target_user.email in {f"sample-{i}@example.invalid" for i in range(6)},
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


@router.get("/{user_id}/posts")
def public_posts(user_id: int, response: Response, paging: PageParams = Depends(), session: Session = Depends(get_session)):
    if not session.get(User,user_id):
        raise HTTPException(404,"User not found.")
    from .posts_router import _to_out
    stmt=select(Post).where(Post.owner_id==user_id,Post.spam_flag==False,
        ~select(CommunityPost.post_id).where(CommunityPost.post_id==Post.id).exists()).order_by(Post.created_at.desc(),Post.id.desc())
    return [_to_out(session,p) for p in paginate(session,stmt,paging,response)]

@router.get("/{user_id}/reviews",response_model=List[ReviewOut])
def public_reviews(user_id: int, response: Response, paging: PageParams = Depends(), session: Session = Depends(get_session)):
    if not session.get(User,user_id):
        raise HTTPException(404,"User not found.")
    stmt=select(Rating).where(Rating.rated_user_id==user_id,
        ~select(CommunityPost.post_id).where(CommunityPost.post_id==Rating.post_id).exists()).order_by(Rating.created_at.desc(),Rating.id.desc())
    out=[]
    for row in paginate(session,stmt,paging,response):
        author=session.get(User,row.rater_id)
        try:
            tags=json.loads(row.tags) if row.tags else []
        except (TypeError,ValueError):
            tags=[]
        out.append(ReviewOut(id=row.id,rater_name=author.name if author else 'Neighbour',rater_badge=badge_for_credits(author.credits) if author else 'Newcomer',stars=row.stars,tags=tags,comment=row.comment,created_at=row.created_at))
    return out
