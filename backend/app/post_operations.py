"""Delete a post and its dependent records in one transaction, without schema changes."""
from sqlalchemy import delete, func
from sqlmodel import select
from .models import Post, ResponseRequest, Message, Rating, Report, User


def delete_post_records(session, post):
    rated_ids = session.exec(select(Rating.rated_user_id).where(Rating.post_id == post.id)).all()
    request_ids = select(ResponseRequest.id).where(ResponseRequest.post_id == post.id)
    session.exec(delete(Message).where(Message.response_request_id.in_(request_ids)))
    session.exec(delete(ResponseRequest).where(ResponseRequest.post_id == post.id))
    session.exec(delete(Rating).where(Rating.post_id == post.id))
    session.exec(delete(Report).where(Report.post_id == post.id))
    session.delete(post)
    session.flush()
    for user_id in set(rated_ids):
        user = session.get(User, user_id)
        count, average = session.exec(select(func.count(Rating.id), func.avg(Rating.stars)).where(Rating.rated_user_id == user_id)).one()
        if user:
            user.rating_count = count
            user.rating_avg = round(average or 0, 2)
            session.add(user)
