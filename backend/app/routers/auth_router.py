from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import func
from ..models import UserMFA, RevokedToken, UserAuthVersion
import secrets
from ..auth import decode_token, oauth2_scheme, password_hasher
from ..mfa import verify_totp

from ..database import get_session
from ..models import User, Locality, Role, badge_for_credits
from ..schemas import SignupIn, LoginIn, TokenOut, UserOut, ContactUpdateIn, AvatarUpdateIn, PasswordChangeIn
from ..auth import hash_password, verify_password, create_access_token, get_current_user

DUMMY_HASH = hash_password("timing-placeholder-not-a-login-credential")

router = APIRouter(prefix="/auth", tags=["auth"])


def get_or_create_locality(session: Session, name: str) -> Locality:
    loc = session.exec(select(Locality).where(Locality.name == name)).first()
    if not loc:
        loc = Locality(name=name)
        session.add(loc)
        session.commit()
        session.refresh(loc)
    return loc


@router.post("/signup", response_model=TokenOut)
def signup(data: SignupIn, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(func.lower(User.email) == str(data.email).lower())).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    loc = get_or_create_locality(session, data.locality)
    user = User(
        name=data.name,
        email=str(data.email).lower(),
        hashed_password=hash_password(data.password),
        locality_id=loc.id,
        role=Role.user,
    )
    from ..product_models import AccountConsent
    session.add(user)
    session.flush()
    session.add(AccountConsent(user_id=user.id, policy_version=data.policy_version,
        privacy_consent=data.privacy_consent, terms_accepted=data.terms_accepted,
        adult_confirmed=data.adult_confirmed))
    session.commit()
    session.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return TokenOut(access_token=token)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(func.lower(User.email) == str(data.email).lower())).first()
    valid_password = verify_password(data.password, user.hashed_password if user else DUMMY_HASH)
    if not user or not valid_password or data.password == "pass1234":
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    from ..safety import restriction
    if restriction(session, user.id) != "active":
        raise HTTPException(401, "Incorrect email or password, or this account is unavailable.")
    mfa = session.get(UserMFA, user.id)
    if mfa and mfa.enabled and not verify_totp(session, mfa, data.totp_code):
        raise HTTPException(status_code=401, detail="Incorrect credentials or authenticator code.")
    if user.hashed_password.startswith("$2") or password_hasher.check_needs_rehash(user.hashed_password):
        user.hashed_password = hash_password(data.password)
        session.add(user)
        session.commit()
    version = session.get(UserAuthVersion, user.id)
    token = create_access_token({"sub": str(user.id), "mfa_version": mfa.version if mfa and mfa.enabled else None,
                                 "auth_version": version.version if version else None})
    return TokenOut(access_token=token)


@router.post("/password", response_model=TokenOut)
def change_password(data: PasswordChangeIn, user: User = Depends(get_current_user),
                    session: Session = Depends(get_session)):
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect current password.")
    mfa = session.get(UserMFA, user.id)
    if mfa and mfa.enabled and not verify_totp(session, mfa, data.totp_code):
        raise HTTPException(status_code=401, detail="Incorrect authenticator code.")
    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="Choose a different password.")
    user.hashed_password = hash_password(data.new_password)
    from ..password_recovery import cancel_recovery
    cancel_recovery(session, user.id)
    version = UserAuthVersion(user_id=user.id, version=secrets.token_urlsafe(24))
    session.add(user)
    session.merge(version)
    session.commit()
    # A fresh cookie keeps this browser signed in; all older sessions are invalidated.
    return TokenOut(access_token=create_access_token({"sub": str(user.id), "auth_version": version.version,
        "mfa_version": mfa.version if mfa and mfa.enabled else None}))


@router.post("/logout")
def logout(user: User = Depends(get_current_user), token: str = Depends(oauth2_scheme),
           session: Session = Depends(get_session)):
    payload = decode_token(token)
    session.merge(RevokedToken(jti=payload["jti"], expires_at=payload["exp"]))
    session.commit()
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    loc = session.get(Locality, user.locality_id) if user.locality_id else None
    return UserOut(
        id=user.id, name=user.name, email=user.email, role=user.role,
        rating_avg=user.rating_avg, rating_count=user.rating_count,
        credits=user.credits, badge=badge_for_credits(user.credits),
        locality=loc.name if loc else None,
        contact_phone=user.contact_phone, contact_visible=user.contact_visible,
        avatar=getattr(user, "avatar", "avatar-1") or "avatar-1",
        verification_status=user.verification_status,
    )


@router.patch("/contact", response_model=UserOut)
def update_contact(
    data: ContactUpdateIn, user: User = Depends(get_current_user), session: Session = Depends(get_session),
):
    from ..product_models import TrustRecord
    trust = session.get(TrustRecord, user.id)
    if trust and user.contact_phone != data.contact_phone:
        trust.phone_verified = False
        session.add(trust)
    user.contact_phone = data.contact_phone
    user.contact_visible = data.contact_visible
    session.add(user)
    session.commit()
    session.refresh(user)
    loc = session.get(Locality, user.locality_id) if user.locality_id else None
    return UserOut(
        id=user.id, name=user.name, email=user.email, role=user.role,
        rating_avg=user.rating_avg, rating_count=user.rating_count,
        credits=user.credits, badge=badge_for_credits(user.credits),
        locality=loc.name if loc else None,
        contact_phone=user.contact_phone, contact_visible=user.contact_visible,
        avatar=getattr(user, "avatar", "avatar-1") or "avatar-1",
        verification_status=user.verification_status,
    )


@router.patch("/avatar", response_model=UserOut)
def update_avatar(
    data: AvatarUpdateIn, user: User = Depends(get_current_user), session: Session = Depends(get_session),
):
    """Update the logged-in user's avatar selection."""
    valid_avatars = {f"avatar-{i}" for i in range(1, 9)}
    import os, re
    owned_photo = bool(re.fullmatch(rf"/uploads/u{user.id}_[0-9a-f]{{32}}\.png", data.avatar) and os.path.isfile(os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", os.path.basename(data.avatar))))
    if data.avatar not in valid_avatars and data.avatar != "initials" and not owned_photo:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Invalid avatar. Choose from avatar-1 to avatar-8.")
    user.avatar = data.avatar
    session.add(user)
    session.commit()
    session.refresh(user)
    loc = session.get(Locality, user.locality_id) if user.locality_id else None
    return UserOut(
        id=user.id, name=user.name, email=user.email, role=user.role,
        rating_avg=user.rating_avg, rating_count=user.rating_count,
        credits=user.credits, badge=badge_for_credits(user.credits),
        locality=loc.name if loc else None,
        contact_phone=user.contact_phone, contact_visible=user.contact_visible,
        avatar=user.avatar,
        verification_status=user.verification_status,
    )


