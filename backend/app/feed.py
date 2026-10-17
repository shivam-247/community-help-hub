"""Apply visibility, search and ordering in SQL before counting or taking a page."""
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import case, or_, func
from sqlmodel import select
from .models import Post, User, Locality
from .product_models import CommunityPost, CommunityMember, Community, Subscription
from .product import active_plan

def feed_statement(session, user, community_id=None, locality=None, category=None,
                   type=None, priority=None, q=None, verified_only=False, sort='newest'):
    if verified_only and (not user or active_plan(session, user.id) == 'free'):
        raise HTTPException(403, 'Verified-member filters are included with Plus and Society plans.')
    stmt = select(Post).join(Locality, Locality.id == Post.locality_id).where(Post.spam_flag == False)
    if community_id is not None:
        if not user or not session.get(Community, community_id) or not session.get(CommunityMember, (community_id, user.id)):
            raise HTTPException(404, 'Board not found.')
        stmt = stmt.join(CommunityPost, CommunityPost.post_id == Post.id).where(CommunityPost.community_id == community_id)
    else:
        stmt = stmt.where(~select(CommunityPost.post_id).where(CommunityPost.post_id == Post.id).exists())
    if locality:
        stmt = stmt.where(Locality.name.contains(locality, autoescape=True))
    for field, value in [(Post.category, category), (Post.type, type), (Post.priority, priority)]:
        if value and value != 'All':
            stmt = stmt.where(field == value)
    if q:
        stmt = stmt.where(or_(Post.title.contains(q, autoescape=True), Post.description.contains(q, autoescape=True)))
    if verified_only:
        stmt = stmt.where(select(User.id).where(User.id == Post.owner_id, User.verification_status == 'verified').exists())
    paid = select(Subscription.user_id).where(Subscription.user_id == Post.owner_id,
        Subscription.plan.in_(['plus','society']), or_(Subscription.expires_at == None,
            Subscription.expires_at > datetime.now(timezone.utc))).exists()
    stmt = stmt.order_by(case((paid, 0), else_=1))
    if sort == 'deadline':
        return stmt.order_by(case((Post.deadline == None, 1), else_=0), Post.deadline, Post.id.desc())
    return stmt.order_by(Post.created_at.desc(), Post.id.desc())


def feed_page(session, stmt, paging):
    from .routers.posts_router import _to_out
    total = session.exec(select(func.count()).select_from(stmt.order_by(None).subquery())).one()
    posts = session.exec(stmt.offset((paging.page-1)*paging.page_size).limit(paging.page_size)).all()
    return {'items':[_to_out(session, p) for p in posts], 'page':paging.page, 'page_size':paging.page_size,
            'total':total, 'has_more':paging.page*paging.page_size < total}
