"""Server-owned plans, quotas, notifications, and transactional email delivery."""
import asyncio
import os
import smtplib
from email.message import EmailMessage
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import update, func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select
from .models import User, Post
from .product_models import Subscription, PostUsage, Notification, NotificationPreference, EmailOutbox, TrustRecord

PLANS = {
    "free": {"name": "Free", "posts_per_month": 5, "monthly_paise": 0, "yearly_paise": 0, "priority": False, "email_alerts": False, "community_tools": False},
    "plus": {"name": "Plus", "posts_per_month": None, "monthly_paise": 9900, "yearly_paise": 95000, "priority": True, "email_alerts": True, "community_tools": False},
    "society": {"name": "Society / Community", "posts_per_month": None, "monthly_paise": 29900, "yearly_paise": 287000, "priority": True, "email_alerts": True, "community_tools": True},
}

def active_plan(session, user_id):
    sub = session.get(Subscription, user_id)
    if sub and sub.plan in PLANS and (sub.expires_at is None or sub.expires_at.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc)):
        return sub.plan
    return "free"

def period():
    return datetime.now(timezone.utc).strftime("%Y-%m")

def usage(session, user_id):
    row = session.get(PostUsage, (user_id, period()))
    if row:
        return row.count
    start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return session.exec(select(func.count(Post.id)).where(Post.owner_id == user_id, Post.created_at >= start)).one()

def consume_post(session, user_id):
    """Atomic quota reservation in the same transaction as the new post."""
    key = (user_id, period())
    if not session.get(PostUsage, key):
        try:
            with session.begin_nested():
                session.add(PostUsage(user_id=user_id, period=key[1], count=usage(session, user_id)))
                session.flush()
        except IntegrityError:
            pass
    limit = PLANS[active_plan(session, user_id)]["posts_per_month"]
    statement = update(PostUsage).where(PostUsage.user_id == user_id, PostUsage.period == key[1])
    if limit is not None:
        statement = statement.where(PostUsage.count < limit)
    changed = session.execute(statement.values(count=PostUsage.count + 1)).rowcount
    if changed != 1:
        raise HTTPException(429, f"You have used your {limit} posts this month. Your allowance resets on the first of next month. Upgrade in Billing for more posts.")

def notify(session, user_id, title, body, href):
    pref = session.get(NotificationPreference, user_id)
    if not pref or pref.in_app:
        session.add(Notification(user_id=user_id, title=title, body=body, href=href))
    trust = session.get(TrustRecord, user_id)
    if pref and pref.email_alerts and trust and trust.email_verified and PLANS[active_plan(session, user_id)]["email_alerts"]:
        session.add(EmailOutbox(user_id=user_id, subject=title, body=body + "\n" + os.getenv("APP_ORIGIN", "http://localhost:3000") + href))

def send_email(recipient, subject, body):
    message = EmailMessage()
    message["From"] = os.environ["SMTP_FROM"]
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)
    with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.getenv("SMTP_PORT", "587")), timeout=15) as client:
        client.ehlo()
        client.starttls()
        client.ehlo()
        if os.getenv("SMTP_USER"):
            client.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
        client.send_message(message)

def drain_outbox(engine):
    if not os.getenv("SMTP_HOST") or not os.getenv("SMTP_FROM"):
        return
    with Session(engine) as session:
        for row in session.exec(select(EmailOutbox).where(EmailOutbox.status == "queued", EmailOutbox.attempts < 5).limit(20)).all():
            user = session.get(User, row.user_id)
            row.attempts += 1
            try:
                if user:
                    send_email(user.email, row.subject, row.body)
                    row.status = "sent"
                else:
                    row.status = "failed"
            except (OSError, smtplib.SMTPException):
                if row.attempts >= 5:
                    row.status = "failed"
            session.add(row)
            session.commit()

async def email_worker(engine):
    while True:
        try:
            await asyncio.to_thread(drain_outbox, engine)
        except Exception as exc:
            from .observability import logger
            logger.error('email_worker_failed', extra={'error_type':type(exc).__name__})
        await asyncio.sleep(30)
