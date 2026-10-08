import json
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import update, func
from sqlalchemy.exc import IntegrityError

from ..database import get_session
from ..models import Rating, RatingClaim, Post, User, PostStatus, ResponseRequest, RequestStatus
from ..schemas import RatingIn
from ..auth import get_current_user

router = APIRouter(prefix="/posts", tags=["ratings"])


@router.post("/{post_id}/rate")
def rate_post(
    post_id: int, data: RatingIn,
    user: User = Depends(get_current_user), session: Session = Depends(get_session),
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if post.status != PostStatus.resolved:
        raise HTTPException(status_code=400, detail="Ratings open only after the post is marked Resolved.")

    if post.owner_id == user.id:
        accepted = session.exec(
            select(ResponseRequest).where(
                ResponseRequest.post_id == post_id, ResponseRequest.status == RequestStatus.accepted
            )
        ).first()
        if not accepted:
            raise HTTPException(status_code=400, detail="No accepted responder to rate yet.")
        rated_user_id = accepted.requester_id
    else:
        rr = session.exec(
            select(ResponseRequest).where(
                ResponseRequest.post_id == post_id,
                ResponseRequest.requester_id == user.id,
                ResponseRequest.status == RequestStatus.accepted,
            )
        ).first()
        if not rr:
            raise HTTPException(status_code=403, detail="Only the post owner or accepted responder can rate.")
        rated_user_id = post.owner_id

    if not (1 <= data.stars <= 5):
        raise HTTPException(status_code=400, detail="Stars must be between 1 and 5.")

    existing = session.exec(select(Rating).where(Rating.post_id == post_id, Rating.rater_id == user.id)).first()
    if existing:
        raise HTTPException(status_code=409, detail="You already rated this exchange.")

    session.add(RatingClaim(post_id=post_id, rater_id=user.id))
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="You already rated this exchange.")

    rating = Rating(
        post_id=post_id, rater_id=user.id, rated_user_id=rated_user_id,
        stars=data.stars, tags=json.dumps(data.tags), comment=data.comment,
    )
    session.add(rating)

    session.exec(update(User).where(User.id == rated_user_id).values(
        rating_count=User.rating_count + 1,
        rating_avg=func.round((User.rating_avg * User.rating_count + data.stars) / (User.rating_count + 1), 2),
        
    ))

    session.commit()
    return {"ok": True}

