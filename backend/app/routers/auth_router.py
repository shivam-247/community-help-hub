from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import User, Locality, Role, badge_for_credits
from ..schemas import SignupIn, LoginIn, TokenOut, UserOut, ContactUpdateIn, AvatarUpdateIn
from ..auth import hash_password, verify_password, create_access_token, get_current_user

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
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    loc = get_or_create_locality(session, data.locality)
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
        locality_id=loc.id,
        role=Role.user,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return TokenOut(access_token=token)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = create_access_token({"sub": str(user.id)})
    return TokenOut(access_token=token)


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
    if data.avatar not in valid_avatars:
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

