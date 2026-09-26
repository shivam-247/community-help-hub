from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlmodel import Session, select

from .database import get_session
from .models import User, Role

SECRET_KEY = "dev-secret-change-me"  # move to env var in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    # bcrypt has a 72-byte input limit; truncate defensively
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in.",
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = session.get(User, int(user_id))
    if user is None:
        raise credentials_exception
    return user


def get_current_user_optional(
    token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        return session.get(User, int(user_id)) if user_id else None
    except JWTError:
        return None


def is_admin_or_super(user: User) -> bool:
    return user.role in (Role.admin, Role.super_admin, "admin", "super_admin")


def is_super_admin(user: User) -> bool:
    return user.role in (Role.super_admin, "super_admin")


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not is_admin_or_super(user):
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


def require_super_admin(user: User = Depends(get_current_user)) -> User:
    if not is_super_admin(user):
        raise HTTPException(status_code=403, detail="Super Admin access required.")
    return user
