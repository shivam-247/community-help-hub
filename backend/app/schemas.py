from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

EmailStr = str  # avoid extra email-validator dependency at runtime
from .models import PostType, Priority, PostStatus, RequestStatus, ReportStatus


class SignupIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    locality: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


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


class AvatarUpdateIn(BaseModel):
    avatar: str


class UserRoleUpdateIn(BaseModel):
    role: str


class VerificationSubmitIn(BaseModel):
    proof_type: str
    proof_value: str
    note: Optional[str] = None


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


class VerificationReviewIn(BaseModel):
    approve: bool
    reviewer_comment: Optional[str] = None


class ContactUpdateIn(BaseModel):
    contact_phone: Optional[str] = None
    contact_visible: bool = False


class PostCreateIn(BaseModel):
    type: PostType
    title: str
    description: str
    locality: str
    priority: Priority = Priority.medium
    deadline: Optional[datetime] = None
    image_url: Optional[str] = None


class PostOut(BaseModel):
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


class StatusUpdateIn(BaseModel):
    status: PostStatus


class PostUpdateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, min_length=1, max_length=10000)
    priority: Optional[Priority] = None
    deadline: Optional[datetime] = None
    status: Optional[PostStatus] = None


class ReportUpdateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: ReportStatus


class ResponseRequestIn(BaseModel):
    message: str


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


class RequestActionIn(BaseModel):
    action: str  # "accept" | "reject"


class MessageIn(BaseModel):
    text: str


class MessageOut(BaseModel):
    id: int
    response_request_id: int
    sender_id: int
    sender_name: str
    text: str
    created_at: datetime


class RatingIn(BaseModel):
    stars: int
    tags: List[str] = []
    comment: Optional[str] = None


class ReportIn(BaseModel):
    reason: str
