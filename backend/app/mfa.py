"""TOTP secrets are encrypted with a separate deployment key; codes are single-use."""
import secrets
import time
import hmac
import pyotp
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import update
from sqlmodel import Session
from .database import get_session
from .models import User, UserMFA, UserAuthVersion
from .schemas import MFASetupIn, MFAConfirmIn, TokenOut
from .settings import MFA_ENCRYPTION_KEY
from .auth import get_current_user, verify_password, create_access_token

router = APIRouter(prefix="/auth/mfa", tags=["MFA"])


def cipher():
    try:
        return Fernet(MFA_ENCRYPTION_KEY.encode())
    except (ValueError, TypeError):
        raise HTTPException(status_code=503, detail="Authenticator setup is not configured by the operator.")


def verify_totp(session, record, code):
    if not code:
        return False
    try:
        secret = cipher().decrypt(record.encrypted_secret.encode()).decode()
    except InvalidToken:
        raise HTTPException(status_code=503, detail="Authenticator key is unavailable.")
    totp = pyotp.TOTP(secret)
    now = int(time.time()) // 30
    for step in (now, now - 1, now + 1):
        if step > record.last_step and hmac.compare_digest(totp.at(step * 30), code):
            result = session.exec(update(UserMFA).where(UserMFA.user_id == record.user_id,
                UserMFA.last_step < step, UserMFA.version == record.version).values(last_step=step))
            session.commit()
            return result.rowcount == 1
    return False


@router.get("")
def status(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    record = session.get(UserMFA, user.id)
    return {"enabled": bool(record and record.enabled)}


@router.post("/setup")
def setup(data: MFASetupIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect password.")
    record = session.get(UserMFA, user.id)
    if record and record.enabled:
        raise HTTPException(status_code=409, detail="Authenticator already enabled.")
    secret = pyotp.random_base32()
    record = UserMFA(user_id=user.id, encrypted_secret=cipher().encrypt(secret.encode()).decode(),
        version=secrets.token_urlsafe(24), setup_expires_at=int(time.time()) + 600)
    session.merge(record)
    session.commit()
    return {"secret": secret, "uri": pyotp.TOTP(secret).provisioning_uri(user.email, issuer_name="Community Help Hub")}


@router.post("/confirm", response_model=TokenOut)
def confirm(data: MFAConfirmIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    record = session.get(UserMFA, user.id)
    if not record or record.enabled or record.setup_expires_at < int(time.time()):
        raise HTTPException(status_code=400, detail="Start authenticator setup again.")
    if not verify_totp(session, record, data.code):
        raise HTTPException(status_code=400, detail="Incorrect or reused authenticator code.")
    result = session.exec(update(UserMFA).where(UserMFA.user_id == user.id,
        UserMFA.version == record.version, UserMFA.enabled == False).values(enabled=True))
    session.commit()
    if result.rowcount != 1:
        raise HTTPException(status_code=409, detail="Authenticator setup changed; start again.")
    version = session.get(UserAuthVersion, user.id)
    return TokenOut(access_token=create_access_token({"sub": str(user.id), "mfa_version": record.version,
        "auth_version": version.version if version else None}))
