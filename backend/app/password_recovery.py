"""Single-use email recovery codes; MFA remains required for protected accounts."""
import hashlib
import hmac
import secrets
import time
from fastapi import APIRouter, Depends, HTTPException
from pydantic import EmailStr, Field
from sqlalchemy import func, update
from sqlmodel import Field as SQLField, SQLModel, Session, select
from .auth import SECRET_KEY, hash_password
from .database import get_session
from .email_delivery import email_available
from .input_validation import InputModel
from .models import User, UserMFA, UserAuthVersion
from .product_models import EmailOutbox
from .safety import restriction

router = APIRouter(prefix="/auth", tags=["password recovery"])
SUBJECT = "Your Community Help Hub password reset code"
ACKNOWLEDGEMENT = "If an eligible account exists, a password reset code will be emailed. Check your inbox and spam folder."
INVALID_CODE = "The reset code or authenticator code is invalid or expired. Request a new reset code if needed."


class PasswordResetChallenge(SQLModel, table=True):
    user_id: int = SQLField(primary_key=True, foreign_key="user.id")
    digest: str
    expires_at: int
    attempts: int = 0


class RecoveryIn(InputModel):
    email: EmailStr


class ResetIn(RecoveryIn):
    code: str = Field(pattern=r"^[0-9]{8}$")
    new_password: str = Field(min_length=12, max_length=128)
    totp_code: str | None = Field(default=None, pattern=r"^[0-9]{6}$")


def digest(user_id, code):
    return hmac.new(SECRET_KEY.encode(), f"password-reset:{user_id}:{code}".encode(), hashlib.sha256).hexdigest()


def cancel_recovery(session, user_id):
    challenge = session.get(PasswordResetChallenge, user_id)
    if challenge:
        session.delete(challenge)
    for row in session.exec(select(EmailOutbox).where(EmailOutbox.user_id == user_id,
            EmailOutbox.subject == SUBJECT, EmailOutbox.status == "queued")).all():
        row.status, row.body = "cancelled", "Removed"
        session.add(row)


@router.post("/forgot-password")
def request_reset(data: RecoveryIn, session: Session = Depends(get_session)):
    started = time.monotonic()
    if not email_available():
        raise HTTPException(503, "Password recovery email is temporarily unavailable. Please try again later.")
    user = session.exec(select(User).where(func.lower(User.email) == str(data.email).lower())).first()
    acknowledgement = {"ok": True, "message": ACKNOWLEDGEMENT}
    def respond():
        # Keep fast unknown/cooldown responses comparable to an actual queue write.
        time.sleep(max(0, 0.15 - (time.monotonic() - started)))
        return acknowledgement
    if not user or restriction(session, user.id) != "active":
        return respond()
    session.execute(update(User).where(User.id == user.id).values(credits=User.credits))
    session.expire_all()
    old = session.get(PasswordResetChallenge, user.id)
    now = int(time.time())
    if old and old.expires_at > now + 540:
        session.rollback()
        return respond()
    cancel_recovery(session, user.id)
    session.flush()
    code = f"{secrets.randbelow(100_000_000):08d}"
    session.add(PasswordResetChallenge(user_id=user.id, digest=digest(user.id, code), expires_at=now + 600))
    session.add(EmailOutbox(user_id=user.id, subject=SUBJECT,
        body=f"Your password reset code is {code}. It expires in 10 minutes. Never share it. "
             "Enter it only on Community Help Hub. If you did not request this, ignore this email. "
             "If your account uses an authenticator, its current code is also required."))
    session.commit()
    return respond()


@router.post("/reset-password")
def reset_password(data: ResetIn, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(func.lower(User.email) == str(data.email).lower())).first()
    if not user or restriction(session, user.id) != "active":
        raise HTTPException(400, INVALID_CODE)
    # Serialize recovery consumption and credential changes; do not commit MFA separately.
    session.execute(update(User).where(User.id == user.id).values(credits=User.credits))
    session.expire_all()
    row = session.get(PasswordResetChallenge, user.id)
    if not row or row.expires_at <= int(time.time()) or row.attempts >= 5:
        raise HTTPException(400, INVALID_CODE)
    row.attempts += 1
    session.add(row)
    valid = hmac.compare_digest(row.digest, digest(user.id, data.code))
    mfa = session.get(UserMFA, user.id)
    if valid and mfa and mfa.enabled:
        from .mfa import verify_totp
        valid = verify_totp(session, mfa, data.totp_code, commit=False)
    if not valid:
        session.commit()
        raise HTTPException(400, INVALID_CODE)
    user.hashed_password = hash_password(data.new_password)
    session.add(user)
    session.merge(UserAuthVersion(user_id=user.id, version=secrets.token_urlsafe(24)))
    cancel_recovery(session, user.id)
    session.add(EmailOutbox(user_id=user.id, subject="Your Community Help Hub password was changed",
        body="Your password was reset and existing sessions were signed out. Your authenticator settings were preserved. If this was not you, contact the project maintainer immediately."))
    session.commit()
    return {"ok": True}
