"""Publishing requires independently reviewed community membership, on every plan."""
from fastapi import HTTPException
from .models import VerificationStatus
from .product_models import TrustRecord


def can_publish(session, user):
    trust = session.get(TrustRecord, user.id)
    return bool(user.verification_status == VerificationStatus.verified
                and trust and trust.address_verified)


def require_publishing_verification(session, user):
    if not can_publish(session, user):
        raise HTTPException(403, "Community verification is required before publishing. Submit a society reference in Settings → Trust & Verification and wait for administrator approval.")
