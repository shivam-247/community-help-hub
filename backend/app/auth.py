from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets
import bcrypt
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from .database import get_session
from .models import User, Role, UserMFA, RevokedToken, UserAuthVersion
from .settings import SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES

ALGORITHM = "HS256"
ISSUER = "community-help-hub"
AUDIENCE = "community-help-hub-api"
password_hasher = PasswordHasher()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        if hashed.startswith("$2"):
            # Legacy hashes only; never truncate new passwords silently.
            return len(plain.encode()) <= 72 and bcrypt.checkpw(plain.encode(), hashed.encode())
        return password_hasher.verify(hashed, plain)
    except (ValueError, InvalidHashError, VerificationError):
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({**data, "exp": now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)),
        "iat": now, "iss": ISSUER, "aud": AUDIENCE, "jti": secrets.token_urlsafe(24)},
        SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], issuer=ISSUER, audience=AUDIENCE,
        options={"require": ["sub", "exp", "iat", "iss", "aud", "jti"]})


def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> User:
    error = HTTPException(status_code=401, detail="Could not validate credentials. Please log in.")
    if not token:
        raise error
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
        if user_id <= 0 or session.get(RevokedToken, payload["jti"]):
            raise error
        user = session.get(User, user_id)
        auth_version = session.get(UserAuthVersion, user_id)
        if auth_version and payload.get("auth_version") != auth_version.version:
            raise error
        mfa = session.get(UserMFA, user_id)
        if user is None or (mfa and mfa.enabled and payload.get("mfa_version") != mfa.version):
            raise error
        return user
    except (jwt.PyJWTError, ValueError, TypeError, KeyError):
        raise error


def get_current_user_optional(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> Optional[User]:
    if not token:
        return None
    try:
        return get_current_user(token, session)
    except HTTPException:
        return None


def is_admin_or_super(user: User) -> bool:
    return user.role in (Role.admin, Role.super_admin)


def is_super_admin(user: User) -> bool:
    return user.role == Role.super_admin


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not is_admin_or_super(user):
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


def require_super_admin(user: User = Depends(get_current_user)) -> User:
    if not is_super_admin(user):
        raise HTTPException(status_code=403, detail="Super Admin access required.")
    return user
