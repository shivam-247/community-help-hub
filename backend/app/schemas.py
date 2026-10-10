from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator
from typing import Annotated, Literal

class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_max_length=10000)


ShortText = Annotated[str, Field(min_length=1, max_length=200)]
from .models import PostType, Priority, PostStatus, RequestStatus, ReportStatus


class SignupIn(InputModel):
    name: ShortText
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    locality: ShortText
    privacy_consent: Literal[True]
    terms_accepted: Literal[True]
    adult_confirmed: Literal[True]
    policy_version: Literal["2026-10-10"]


class LoginIn(InputModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    totp_code: Optional[str] = Field(default=None, pattern=r"^\d{6}$")


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PasswordChangeIn(InputModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)
    totp_code: Optional[str] = Field(default=None, pattern=r"^\d{6}$")


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    rating_avg: float
    rating_count: int
    credits: int
    badge: str
    locality: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_visible: bool = False
    avatar: Optional[str] = "avatar-1"
    verification_status: str = "Unverified"


class AvatarUpdateIn(InputModel):
    avatar: str


class UserRoleUpdateIn(InputModel):
    role: str


class VerificationSubmitIn(InputModel):
    proof_type: Literal["Reference"]
    proof_value: str = Field(min_length=1, max_length=1000)
    note: Optional[str] = Field(default=None, max_length=2000)


    @field_validator("proof_value", "note")
    @classmethod
    def no_identity_numbers(cls, value):
        import re
        if value and (re.search(r"(?<!\d)\d{4}[ -]?\d{4}[ -]?\d{4}(?!\d)", value)
                      or re.search(r"\b[A-Z]{5}\d{4}[A-Z]\b", value, re.I)):
            raise ValueError("Do not submit government identity numbers. Use a society reference.")
        return value


class VerificationOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    proof_type: str
    proof_value: str
    note: Optional[str] = None
    status: str
    reviewer_comment: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None


class VerificationReviewIn(InputModel):
    approve: bool
    reviewer_comment: Optional[str] = None


class ContactUpdateIn(InputModel):
    contact_phone: Optional[str] = Field(default=None, max_length=32)
    contact_visible: bool = False


class PostCreateIn(InputModel):
    category: Optional[Literal["Help Requests", "Donations & Giveaways", "Skill Offers", "Community Alerts"]] = None
    community_id: Optional[int] = Field(default=None, ge=1)
    type: PostType
    title: ShortText
    description: str = Field(min_length=1, max_length=10000)
    locality: ShortText
    priority: Priority = Priority.medium
    deadline: Optional[datetime] = None
    image_url: Optional[str] = Field(default=None, pattern=r"^/uploads/u[1-9][0-9]*_[0-9a-f]{32}\.png$")


class PostOut(BaseModel):
    priority_listing: bool = False
    is_demo: bool = False
    community_id: Optional[int] = None
    id: int
    owner_id: int
    owner_name: str
    owner_rating: float
    owner_badge: str
    owner_avatar: Optional[str] = "avatar-1"
    locality: str
    type: PostType
    title: str
    description: str
    priority: Priority
    deadline: Optional[datetime]
    status: PostStatus
    category: str
    image_url: Optional[str] = None
    spam_score: float
    spam_flag: bool
    duplicates: List[dict] = []
    created_at: datetime


class StatusUpdateIn(InputModel):
    status: PostStatus


class PostUpdateIn(InputModel):
    model_config = ConfigDict(extra="forbid")
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, min_length=1, max_length=10000)
    priority: Optional[Priority] = None
    deadline: Optional[datetime] = None
    status: Optional[PostStatus] = None


class ReportUpdateIn(InputModel):
    model_config = ConfigDict(extra="forbid")
    status: ReportStatus


class ResponseRequestIn(InputModel):
    message: str = Field(min_length=1, max_length=2000)


class ResponseRequestOut(BaseModel):
    id: int
    post_id: int
    post_title: str
    post_type: PostType
    requester_id: int
    requester_name: str
    requester_rating: float
    requester_badge: str
    owner_id: int
    owner_name: str
    message: str
    status: RequestStatus
    created_at: datetime
    owner_contact: Optional[str] = None
    requester_contact: Optional[str] = None


class RequestActionIn(InputModel):
    action: Literal["accept", "reject"]


class MessageIn(InputModel):
    text: str = Field(min_length=1, max_length=4000)


class MessageOut(BaseModel):
    id: int
    response_request_id: int
    sender_id: int
    sender_name: str
    text: str
    created_at: datetime


class RatingIn(InputModel):
    stars: int = Field(ge=1, le=5)
    tags: List[Annotated[str, Field(max_length=50)]] = Field(default_factory=list, max_length=10)
    comment: Optional[str] = Field(default=None, max_length=2000)


class ReportIn(InputModel):
    reason: str = Field(min_length=1, max_length=2000)



class MFASetupIn(InputModel):
    password: str = Field(min_length=1, max_length=128)


class MFAConfirmIn(InputModel):
    code: str = Field(pattern=r"^\d{6}$")
