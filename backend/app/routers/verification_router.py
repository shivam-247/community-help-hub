from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response
from ..pagination import PageParams, paginate
from sqlmodel import Session, select

from ..database import get_session
from ..models import Verification, User, VerificationStatus
from ..schemas import VerificationSubmitIn, VerificationOut, VerificationReviewIn
from ..auth import get_current_user, require_admin

router = APIRouter(tags=["verification"])


def _to_out(session: Session, v: Verification) -> VerificationOut:
    user = session.get(User, v.user_id)
    return VerificationOut(
        id=v.id, user_id=v.user_id, user_name=user.name,
        proof_type=v.proof_type, proof_value=v.proof_value, note=v.note,
        status=v.status, reviewer_comment=v.reviewer_comment,
        created_at=v.created_at, reviewed_at=v.reviewed_at,
    )


@router.post("/verification/submit", response_model=VerificationOut)
def submit_verification(
    data: VerificationSubmitIn,
    user: User = Depends(get_current_user), session: Session = Depends(get_session),
):
    if user.verification_status == VerificationStatus.verified:
        raise HTTPException(status_code=400, detail="You're already verified.")
    existing_pending = session.exec(
        select(Verification).where(
            Verification.user_id == user.id, Verification.status == VerificationStatus.pending
        )
    ).first()
    if existing_pending:
        raise HTTPException(status_code=400, detail="You already have a verification request pending review.")

    v = Verification(
        user_id=user.id, proof_type=data.proof_type,
        proof_value=data.proof_value, note=data.note,
    )
    session.add(v)
    user.verification_status = VerificationStatus.pending
    session.add(user)
    session.commit()
    session.refresh(v)
    return _to_out(session, v)


@router.get("/verification/mine", response_model=List[VerificationOut])
def my_verifications(response: Response, paging: PageParams = Depends(), user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    items = paginate(session, select(Verification).where(Verification.user_id == user.id).order_by(Verification.created_at.desc(), Verification.id.desc()), paging, response)
    items.sort(key=lambda v: v.created_at, reverse=True)
    return [_to_out(session, v) for v in items]


@router.get("/admin/verifications", response_model=List[VerificationOut])
def list_pending_verifications(
    response: Response, paging: PageParams = Depends(), admin: User = Depends(require_admin), session: Session = Depends(get_session),
):
    items = paginate(session, select(Verification).where(Verification.status == VerificationStatus.pending).order_by(Verification.id), paging, response)
    items.sort(key=lambda v: v.created_at)
    return [_to_out(session, v) for v in items]


@router.patch("/admin/verifications/{verification_id}", response_model=VerificationOut)
def review_verification(
    verification_id: int, data: VerificationReviewIn,
    admin: User = Depends(require_admin), session: Session = Depends(get_session),
):
    v = session.get(Verification, verification_id)
    if not v:
        raise HTTPException(status_code=404, detail="Verification request not found.")
    if v.user_id == admin.id:
        raise HTTPException(status_code=403, detail="You cannot review your own verification.")
    if v.status != VerificationStatus.pending:
        raise HTTPException(status_code=400, detail="This request was already reviewed.")

    applicant = session.get(User, v.user_id)
    v.status = VerificationStatus.verified if data.approve else VerificationStatus.rejected
    v.reviewer_id = admin.id
    v.reviewer_comment = data.reviewer_comment
    v.reviewed_at = datetime.now(timezone.utc)
    applicant.verification_status = v.status
    from ..product_models import TrustRecord
    from ..safety import audit
    trust = session.get(TrustRecord, applicant.id) or TrustRecord(user_id=applicant.id)
    trust.address_verified = bool(data.approve)
    if not data.approve:
        trust.phone_verified = False
    session.add(trust)
    audit(session, admin, applicant.id, "verification_approved" if data.approve else "verification_rejected", data.reviewer_comment or "Society reference reviewed")
    session.add(v)
    session.add(applicant)
    from ..product import notify
    notify(session, applicant.id, "Community review updated", "Your evidence was " + ("approved." if data.approve else "not approved. Review the feedback in your Trust Center."), "/settings?tab=trust")
    session.commit()
    session.refresh(v)
    return _to_out(session, v)

