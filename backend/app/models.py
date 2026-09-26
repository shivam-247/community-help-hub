from datetime import datetime, timezone
from typing import Optional, List
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship


# ---------- Enums ----------

class Role(str, Enum):
    user = "user"
    admin = "admin"
    super_admin = "super_admin"


class VerificationStatus(str, Enum):
    unverified = "unverified"
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class PostType(str, Enum):
    need_help = "Need help"
    offer_help = "Offer help"
    request_item = "Request item"
    offer_service = "Offer service"


class Priority(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"


class PostStatus(str, Enum):
    open = "Open"
    in_progress = "In Progress"
    resolved = "Resolved"


class RequestStatus(str, Enum):
    pending = "Pending"
    accepted = "Accepted"
    rejected = "Rejected"


class ReportStatus(str, Enum):
    open = "Open"
    reviewed = "Reviewed"
    actioned = "Actioned"


CATEGORIES = [
    "Help Requests",
    "Donations & Giveaways",
    "Skill Offers",
    "Community Alerts",
]


# ---------- Entities ----------

class Locality(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    hashed_password: str
    role: Role = Field(default=Role.user)
    locality_id: Optional[int] = Field(default=None, foreign_key="locality.id")
    rating_avg: float = Field(default=0.0)
    rating_count: int = Field(default=0)
    credits: int = Field(default=0)
    contact_phone: Optional[str] = Field(default=None)
    contact_visible: bool = Field(default=False)
    avatar: Optional[str] = Field(default="avatar-1")
    verification_status: VerificationStatus = Field(default=VerificationStatus.unverified)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def badge_for_credits(credits: int) -> str:
    if credits >= 100:
        return "Community Champion"
    if credits >= 50:
        return "Trusted Helper"
    if credits >= 20:
        return "Active Helper"
    if credits >= 5:
        return "Helper"
    return "Newcomer"


class Post(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    locality_id: int = Field(foreign_key="locality.id")
    type: PostType
    title: str
    description: str
    priority: Priority = Field(default=Priority.medium)
    deadline: Optional[datetime] = None
    status: PostStatus = Field(default=PostStatus.open)
    category: str = Field(default="Other")
    image_url: Optional[str] = Field(default=None)
    spam_score: float = Field(default=0.0)
    spam_flag: bool = Field(default=False)
    duplicate_of: Optional[str] = Field(default=None)  # JSON string of candidates
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ResponseRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="post.id")
    requester_id: int = Field(foreign_key="user.id")
    message: str
    status: RequestStatus = Field(default=RequestStatus.pending)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    response_request_id: int = Field(foreign_key="responserequest.id")
    sender_id: int = Field(foreign_key="user.id")
    text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Rating(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="post.id")
    rater_id: int = Field(foreign_key="user.id")
    rated_user_id: int = Field(foreign_key="user.id")
    stars: int
    tags: str = Field(default="[]")  # JSON list
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Report(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="post.id")
    reporter_id: int = Field(foreign_key="user.id")
    reason: str
    status: ReportStatus = Field(default=ReportStatus.open)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Verification(SQLModel, table=True):
    """
    A submitted proof of identity/skill for a user, reviewed by an admin.
    This is deliberately separate from login auth: passing email/password
    only proves you control an inbox, not that you're trustworthy to help.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    proof_type: str  # e.g. "Government ID", "Certificate", "Reference"
    proof_value: str  # ID number / certificate description / reference contact — free text for MVP
    note: Optional[str] = Field(default=None)  # applicant's own note to the reviewer
    status: VerificationStatus = Field(default=VerificationStatus.pending)
    reviewer_id: Optional[int] = Field(default=None, foreign_key="user.id")
    reviewer_comment: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: Optional[datetime] = Field(default=None)