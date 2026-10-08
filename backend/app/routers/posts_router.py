import json
import os
import uuid
import io
import warnings
from PIL import Image, UnidentifiedImageError
from ..settings import MAX_IMAGE_BYTES
from datetime import timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlmodel import Session, select

from ..database import get_session
from ..models import Post, User, Locality, PostStatus, Role, badge_for_credits
from ..schemas import PostCreateIn, PostOut, StatusUpdateIn, PostUpdateIn
from ..post_operations import delete_post_records
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
    content = file.file.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Images must be at most 5 MB.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(content)) as image:
                if image.format not in {"PNG", "JPEG", "GIF", "WEBP"}:
                    raise ValueError("Unsupported image format")
                if image.width * image.height > 16_000_000:
                    raise ValueError("Image dimensions too large")
                image.load()
                # Re-encode pixels: discard scripts, metadata, and extra frames.
                clean = image.convert("RGBA")
                filename = f"u{user.id}_{uuid.uuid4().hex}.png"
                clean.save(os.path.join(UPLOAD_DIR, filename), format="PNG")
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombWarning, Image.DecompressionBombError):
        raise HTTPException(status_code=400, detail="Upload a valid PNG, JPEG, GIF or WebP image up to 16 megapixels.")
    finally:
        file.file.close()
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
    if data.image_url and (not data.image_url.startswith(f"/uploads/u{user.id}_") or not os.path.isfile(os.path.join(UPLOAD_DIR, os.path.basename(data.image_url)))):
        raise HTTPException(status_code=403, detail="Use an image uploaded by your own account.")
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


@router.patch("/{post_id}", response_model=PostOut)
def edit_post(
    post_id: int, data: PostUpdateIn,
    user: User = Depends(get_current_user), session: Session = Depends(get_session),
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    changes = data.model_dump(exclude_unset=True)
    if post.owner_id != user.id:
        if not is_admin_or_super(user) or set(changes) - {"status"}:
            raise HTTPException(status_code=403, detail="Only the owner can edit post content; admins can update status.")
    for field, value in changes.items():
        if value is None and field != "deadline":
            raise HTTPException(status_code=422, detail=f"{field} cannot be null.")
    if "title" in changes or "description" in changes:
        title = changes.get("title", post.title).strip()
        description = changes.get("description", post.description).strip()
        valid, detail = ml_engine.validate_post_quality(title, description)
        if not valid:
            raise HTTPException(status_code=422, detail=detail)
        changes.update(title=title, description=description)
        full_text = f"{title} {description}"
        post.category = ml_engine.predict_category(full_text)
        post.spam_score, post.spam_flag = ml_engine.spam_check(full_text)
        candidates = session.exec(select(Post).where(
            Post.locality_id == post.locality_id, Post.status == PostStatus.open, Post.id != post.id
        )).all()
        duplicates = ml_engine.find_duplicates(full_text, [(p.id, f"{p.title} {p.description}") for p in candidates])
        post.duplicate_of = json.dumps(duplicates) if duplicates else None
    if changes.get("deadline"):
        deadline = changes["deadline"]
        changes["deadline"] = deadline.replace(tzinfo=timezone.utc) if deadline.tzinfo is None else deadline.astimezone(timezone.utc)
    for field, value in changes.items():
        setattr(post, field, value)
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
    delete_post_records(session, post)
    session.commit()
    return {"ok": True, "deleted_post_id": post_id}


@router.get("/meta/categories")
def categories():
    from ..models import CATEGORIES
    return CATEGORIES

