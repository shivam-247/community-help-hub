"""Server-only HTTPS email delivery for hosts that restrict outbound SMTP."""
import http.client
import json
import os
import ssl


class DeliveryError(OSError):
    def __init__(self, message, status_code=None):
        super().__init__(message)
        self.status_code = status_code


def provider():
    return os.getenv("EMAIL_PROVIDER", "resend" if os.getenv("RESEND_API_KEY") else "smtp").strip().lower()


def sender():
    return os.getenv("EMAIL_FROM") or os.getenv("SMTP_FROM", "")


def email_available():
    if provider() == "resend":
        return bool(os.getenv("RESEND_API_KEY", "").strip() and sender().strip())
    if provider() != "smtp":
        return False
    try:
        valid_port = 1 <= int(os.getenv("SMTP_PORT", "587")) <= 65535
    except ValueError:
        return False
    return bool(valid_port and os.getenv("SMTP_HOST") and sender()
                and (not os.getenv("SMTP_USER") or os.getenv("SMTP_PASSWORD")))


def send_resend(recipient, subject, body, html_body=None):
    payload = {"from": sender(), "to": [recipient], "subject": subject, "text": body}
    if html_body:
        payload["html"] = html_body
    # Fixed HTTPS destination, certificate verification and no redirects protect the API key.
    connection = http.client.HTTPSConnection("api.resend.com", timeout=15, context=ssl.create_default_context())
    try:
        connection.request("POST", "/emails", body=json.dumps(payload).encode(), headers={
            "Authorization": "Bearer " + os.environ["RESEND_API_KEY"].strip(),
            "Content-Type": "application/json", "User-Agent": "CommunityHelpHub/1.0",
        })
        response = connection.getresponse()
        content = response.read(16385)
        if not 200 <= response.status < 300:
            # Do not expose provider bodies: they can contain recipients or request details.
            raise DeliveryError("Email provider rejected delivery.", response.status)
        try:
            result = json.loads(content) if len(content) <= 16384 else None
        except (ValueError, UnicodeError):
            result = None
        if not isinstance(result, dict) or not isinstance(result.get("id"), str) or not result["id"]:
            raise OSError("Email provider returned an invalid acknowledgement.")
    except http.client.HTTPException:
        raise OSError("Email provider connection failed.") from None
    finally:
        connection.close()
