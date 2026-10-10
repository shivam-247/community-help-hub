"""Additive product tables; existing account and post records stay intact."""
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field

def now():
    return datetime.now(timezone.utc)

class Subscription(SQLModel, table=True):
    user_id: int = Field(primary_key=True, foreign_key="user.id")
    plan: str = "free"
    cycle: str = "monthly"
    expires_at: Optional[datetime] = None

class PostUsage(SQLModel, table=True):
    user_id: int = Field(primary_key=True, foreign_key="user.id")
    period: str = Field(primary_key=True)
    count: int = 0

class Invoice(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    checkout_key: str = Field(unique=True, index=True)
    user_id: int = Field(foreign_key="user.id")
    plan: str
    cycle: str
    amount_paise: int
    currency: str = "INR"
    status: str = "test_paid"
    created_at: datetime = Field(default_factory=now)

class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    title: str
    body: str
    href: str
    read: bool = False
    created_at: datetime = Field(default_factory=now)

class NotificationPreference(SQLModel, table=True):
    user_id: int = Field(primary_key=True, foreign_key="user.id")
    in_app: bool = True
    email_alerts: bool = False

class EmailOutbox(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    subject: str
    body: str
    status: str = "queued"
    attempts: int = 0
    created_at: datetime = Field(default_factory=now)

class EmailChallenge(SQLModel, table=True):
    user_id: int = Field(primary_key=True, foreign_key="user.id")
    digest: str
    expires_at: int
    attempts: int = 0

class TrustRecord(SQLModel, table=True):
    user_id: int = Field(primary_key=True, foreign_key="user.id")
    email_verified: bool = False
    phone_verified: bool = False
    address_verified: bool = False

class CompletionConfirmation(SQLModel, table=True):
    post_id: int = Field(primary_key=True)
    user_id: int = Field(primary_key=True, foreign_key="user.id")

class CreditEvent(SQLModel, table=True):
    exchange_key: str = Field(primary_key=True)
    post_id: int = Field(index=True)
    user_id: int = Field(primary_key=True, foreign_key="user.id")
    points: int = 10
    created_at: datetime = Field(default_factory=now)

class Community(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    name: str
    pin_code: str
    invite_code: str = Field(unique=True, index=True)

class CommunityMember(SQLModel, table=True):
    community_id: int = Field(primary_key=True, foreign_key="community.id")
    user_id: int = Field(primary_key=True, foreign_key="user.id")

class CommunityPost(SQLModel, table=True):
    post_id: int = Field(primary_key=True, foreign_key="post.id")
    community_id: int = Field(foreign_key="community.id", index=True)

class AccountConsent(SQLModel, table=True):
    user_id: int = Field(primary_key=True, foreign_key="user.id")
    policy_version: str
    privacy_consent: bool
    terms_accepted: bool
    adult_confirmed: bool
    accepted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DemoPost(SQLModel, table=True):
    post_id: int = Field(primary_key=True, foreign_key="post.id")
