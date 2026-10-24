"""Immutable test receipts, private previews and transactional email snapshots."""
import os
from datetime import datetime, timedelta, timezone
from html import escape
from zoneinfo import ZoneInfo
from fastapi import HTTPException
from sqlmodel import select
from .product_models import InvoiceReceipt, EmailOutbox, TrustRecord


def utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def date_label(value):
    return utc(value).astimezone(ZoneInfo("Asia/Kolkata")).strftime("%d %b %Y, %I:%M %p IST")


def smtp_available():
    # Preserve the existing callers while supporting HTTPS providers as well as SMTP.
    from .email_delivery import email_available
    return email_available()


def ensure_receipt(session, invoice, user):
    row = session.get(InvoiceReceipt, invoice.id)
    if row:
        return row
    from .product import PLANS
    plan = PLANS[invoice.plan]
    trust = session.get(TrustRecord, user.id)
    outbox = EmailOutbox(user_id=user.id, subject=f"Test invoice CHH-{invoice.id:06d} - {plan['name']}",
                        body="", status="queued" if trust and trust.email_verified else "awaiting_verification")
    session.add(outbox)
    session.flush()
    starts = utc(invoice.created_at)
    row = InvoiceReceipt(invoice_id=invoice.id, recipient_name=user.name, recipient_email=user.email,
        plan_name=plan['name'], starts_at=starts,
        expires_at=None if invoice.plan == 'free' else starts + timedelta(days=365 if invoice.cycle == 'yearly' else 30),
        allowance="Unlimited posts and active notices, subject to fair-use rate limits and moderation." if plan['posts_per_month'] is None
                  else f"{plan['posts_per_month']} posts per calendar month (UTC). Allowance resets on the first of each month.",
        outbox_id=outbox.id)
    session.add(row)
    outbox.body = receipt_text(invoice, row)
    session.add(outbox)
    session.flush()
    return row


def fields(invoice, row):
    return [
        ("Invoice number", f"CHH-{invoice.id:06d}"),
        ("Customer", row.recipient_name), ("Account email", row.recipient_email),
        ("Plan", row.plan_name), ("Billing interval", invoice.cycle.capitalize()),
        ("Purchased on", date_label(row.starts_at)),
        ("Valid until", date_label(row.expires_at) if row.expires_at else "No expiry on Free"),
        ("Usage allowance", row.allowance),
        ("Simulated plan price", f"INR {invoice.amount_paise / 100:,.2f}"),
        ("Actually charged", "INR 0.00 - no payment was taken"),
        ("Payment mode", "Simulated test checkout"),
    ]


def receipt_text(invoice, row):
    return "COMMUNITY HELP HUB - TEST INVOICE\nNot a tax invoice or proof of payment.\n\n" + "\n".join(f"{label}: {value}" for label, value in fields(invoice, row)) + "\n\nPaid membership does not grant identity verification.\nProject operator: Shivam Parmar\nSupport: parmarshivam247@gmail.com\nKeep this receipt for your practice records. No money was charged."


def receipt_html(invoice, row):
    rows = ''.join(f'<tr><th scope="row">{escape(label)}</th><td>{escape(value)}</td></tr>' for label, value in fields(invoice, row))
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Test invoice CHH-{invoice.id:06d}</title><style>
body{{margin:0;background:#f5f8f5;color:#16251d;font:16px/1.6 Arial,sans-serif}}main{{max-width:660px;margin:32px auto;padding:28px;background:white;border:1px solid #cbd5ce;border-radius:12px}}h1{{font-size:26px;color:#256647}}.notice{{padding:12px;background:#edf6ef;border-left:4px solid #256647}}table{{width:100%;border-collapse:collapse;margin:24px 0}}th,td{{padding:10px 8px;border-bottom:1px solid #d9e2db;text-align:left;vertical-align:top;overflow-wrap:anywhere}}th{{width:38%}}footer{{font-size:13px}}@media(max-width:480px){{main{{margin:0;padding:18px;border:0}}th,td{{padding:8px 4px}}}}@media print{{body{{background:white}}main{{border:0;margin:0;padding:0}}}}
</style></head><body><main><p>Community Help Hub</p><h1>Test invoice</h1><p class="notice"><strong>No money was charged.</strong> This is a simulated checkout receipt, not a tax invoice or proof of payment.</p><table>{rows}</table><p>Paid membership does not grant identity verification.</p><footer>Project operator: Shivam Parmar<br>Support: parmarshivam247@gmail.com<br>Save or print this page for your practice records.</footer></main></body></html>'''


def receipt_payload(session, invoice, row, user):
    if not row:
        return {"invoice_id":invoice.id, "legacy":True, "email_status":"not_created",
                "message":"Request a test receipt to generate a preview for this earlier checkout."}
    outbox = session.get(EmailOutbox, row.outbox_id)
    trust = session.get(TrustRecord, user.id)
    status = outbox.status if outbox else 'failed'
    if status != 'sent':
        if not smtp_available():
            status = 'awaiting_setup'
        elif not trust or not trust.email_verified or user.email != row.recipient_email:
            status = 'awaiting_verification'
    return {"invoice_id":invoice.id, "number":f"CHH-{invoice.id:06d}", "legacy":False,
            "fields":[{"label":label,"value":value} for label,value in fields(invoice,row)],
            "recipient":row.recipient_email, "email_status":"accepted" if status == 'sent' else status,
            "email_available":smtp_available(), "email_verified":bool(trust and trust.email_verified),
            "attempts":outbox.attempts if outbox else 0,
            "message":"Sent means accepted by the email provider; inbox delivery is not guaranteed."}


def request_email(session, invoice, row, user):
    if not row:
        return ensure_receipt(session, invoice, user)
    outbox = session.get(EmailOutbox, row.outbox_id)
    if outbox and outbox.status in {'queued','awaiting_verification'}:
        return row
    if (datetime.now(timezone.utc) - utc(row.email_requested_at)).total_seconds() < 60:
        raise HTTPException(429, "Wait one minute before requesting another invoice email.")
    if not outbox:
        raise HTTPException(409, "This invoice email is unavailable. Contact support.")
    trust = session.get(TrustRecord, user.id)
    outbox.status = 'queued' if trust and trust.email_verified else 'awaiting_verification'
    outbox.attempts = 0
    row.email_requested_at = datetime.now(timezone.utc)
    session.add(outbox)
    session.add(row)
    return row


def release_verified_receipts(session, user_id):
    ids = select(InvoiceReceipt.outbox_id).join(EmailOutbox, EmailOutbox.id == InvoiceReceipt.outbox_id).where(EmailOutbox.user_id == user_id)
    for outbox in session.exec(select(EmailOutbox).where(EmailOutbox.id.in_(ids), EmailOutbox.status == 'awaiting_verification')).all():
        outbox.status = 'queued'
        session.add(outbox)
