import json
import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlmodel import Session, select

from ..database import get_session
from ..models import Post, User, Locality, PostStatus, Role, badge_for_credits
from ..schemas import PostCreateIn, PostOut, StatusUpdateIn
from ..auth import get_current_user, get_current_user_optional, is_admin_or_super
from ..ml import ml_engine
from .auth_router import get_or_create_locality

router = APIRouter(prefix="/posts", tags=["posts"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _to_out(session: Session, post: Post) -> PostOut:
    owner = session.get(User, post.owner_id)
    loc = session.get(Locality, post.locality_id)
    return PostOut(
        id=post.id, owner_id=post.owner_id, owner_name=owner.name,
        owner_rating=owner.rating_avg, owner_badge=badge_for_credits(owner.credits),
        owner_avatar=getattr(owner, "avatar", "avatar-1") or "avatar-1",
        locality=loc.name,
        type=post.type, title=post.title, description=post.description,
        priority=post.priority, deadline=post.deadline, status=post.status,
        category=post.category, image_url=post.image_url,
        spam_score=post.spam_score, spam_flag=post.spam_flag,
        duplicates=json.loads(post.duplicate_of) if post.duplicate_of else [],
        created_at=post.created_at,
    )


@router.post("/upload-image")
def upload_image(
    file: UploadFile = File(...), user: User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".gif", ".webp"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(file.file.read())
    return {"image_url": f"/uploads/{filename}"}


@router.get("", response_model=List[PostOut])
def list_posts(
    locality: Optional[str] = None,
    category: Optional[str] = None,
    type: Optional[str] = None,
    priority: Optional[str] = None,
    q: Optional[str] = None,
    sort: str = Query("deadline", description="deadline | newest"),
    session: Session = Depends(get_session),
):
    stmt = select(Post)
    if locality:
        # Use substring matching so "Gujarat" matches "Gota, Ahmedabad", etc.
        matching_locs = session.exec(
            select(Locality).where(Locality.name.contains(locality))
        ).all()
        if matching_locs:
            loc_ids = [l.id for l in matching_locs]
            stmt = stmt.where(Post.locality_id.in_(loc_ids))
        else:
            return []
    if category and category != "All":
        stmt = stmt.where(Post.category == category)
    if type and type != "All":
        stmt = stmt.where(Post.type == type)
    if priority and priority != "All":
        stmt = stmt.where(Post.priority == priority)
    posts = session.exec(stmt).all()
    if q:
        ql = q.lower()
        posts = [p for p in posts if ql in p.title.lower() or ql in p.description.lower()]
    if sort == "newest":
        posts.sort(key=lambda p: p.created_at, reverse=True)
    else:
        posts.sort(key=lambda p: (p.deadline is None, p.deadline))
    return [_to_out(session, p) for p in posts]


@router.post("", response_model=PostOut)
def create_post(
    data: PostCreateIn,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Quality & Anti-Gibberish validation for new posts
    is_valid, err_msg = ml_engine.validate_post_quality(data.title, data.description)
    if not is_valid:
        raise HTTPException(status_code=422, detail=err_msg)

    loc = get_or_create_locality(session, data.locality)
    full_text = f"{data.title} {data.description}"

    category = ml_engine.predict_category(full_text)
    spam_score, spam_flag = ml_engine.spam_check(full_text)

    open_posts = session.exec(
        select(Post).where(Post.locality_id == loc.id, Post.status == PostStatus.open)
    ).all()
    existing = [(p.id, f"{p.title} {p.description}") for p in open_posts]
    duplicates = ml_engine.find_duplicates(full_text, existing)

    post = Post(
        owner_id=user.id, locality_id=loc.id, type=data.type, title=data.title,
        description=data.description, priority=data.priority, deadline=data.deadline,
        category=category, spam_score=spam_score, spam_flag=spam_flag,
        duplicate_of=json.dumps(duplicates) if duplicates else None,
        image_url=data.image_url,
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    return _to_out(session, post)


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: int, session: Session = Depends(get_session)):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    return _to_out(session, post)


@router.patch("/{post_id}/status", response_model=PostOut)
def update_status(
    post_id: int, data: StatusUpdateIn,
    user: User = Depends(get_current_user), session: Session = Depends(get_session),
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if post.owner_id != user.id and not is_admin_or_super(user):
        raise HTTPException(status_code=403, detail="Only the post owner can update status.")
    post.status = data.status
    session.add(post)
    session.commit()
    session.refresh(post)
    return _to_out(session, post)


@router.delete("/{post_id}")
def delete_post(
    post_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session),
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if post.owner_id != user.id and not is_admin_or_super(user):
        raise HTTPException(status_code=403, detail="Not authorized to delete this post.")
    session.delete(post)
    session.commit()
    return {"ok": True}


@router.get("/meta/categories")
def categories():
    from ..models import CATEGORIES
    return CATEGORIES
