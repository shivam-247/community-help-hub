import json
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Rating, Post, User, PostStatus, ResponseRequest, RequestStatus
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

    rating = Rating(
        post_id=post_id, rater_id=user.id, rated_user_id=rated_user_id,
        stars=data.stars, tags=json.dumps(data.tags), comment=data.comment,
    )
    session.add(rating)

    rated_user = session.get(User, rated_user_id)
    total = rated_user.rating_avg * rated_user.rating_count + data.stars
    rated_user.rating_count += 1
    rated_user.rating_avg = round(total / rated_user.rating_count, 2)
    rated_user.credits += 10  # credits earned for a completed, rated help exchange
    session.add(rated_user)

    session.commit()
    return {"ok": True}
