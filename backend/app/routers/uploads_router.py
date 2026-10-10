"""Serve image bytes using the same visibility scope as their attached notice."""
import os
import re
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from ..database import get_session
from ..auth import get_current_user_optional, is_admin_or_super
from ..models import Post, User
from ..product_models import CommunityPost, CommunityMember
from .posts_router import UPLOAD_DIR
router = APIRouter(prefix="/uploads", tags=["uploads"])

@router.get("/{filename}")
def image(filename: str, user: User | None = Depends(get_current_user_optional),
          session: Session = Depends(get_session)):
    match = re.fullmatch(r"u([1-9][0-9]*)_[0-9a-f]{32}\.png", filename)
    if not match:
        raise HTTPException(404, "Image not found.")
    url = f"/uploads/{filename}"
    allowed = bool(user and (user.id == int(match.group(1)) or is_admin_or_super(user)))
    # A chosen avatar is a public profile photo. Unattached uploads stay owner-only.
    allowed = allowed or bool(session.exec(select(User.id).where(User.avatar == url)).first())
    if not allowed:
        for post in session.exec(select(Post).where(Post.image_url == url, Post.spam_flag == False)).all():
            board = session.get(CommunityPost, post.id)
            if not board or (user and session.get(CommunityMember, (board.community_id, user.id))):
                allowed = True
                break
    path = os.path.join(UPLOAD_DIR, filename)
    if not allowed or not os.path.isfile(path):
        raise HTTPException(404, "Image not found.")
    return FileResponse(path, media_type="image/png", headers={"Cache-Control":"no-store"})
