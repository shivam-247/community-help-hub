"""Fail closed when authentication is not configured."""
import os

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "")
if len(SECRET_KEY.encode()) < 32 or SECRET_KEY == "dev-secret-change-me":
    raise RuntimeError("Set JWT_SECRET_KEY to a cryptographically random secret of at least 32 bytes.")
MFA_ENCRYPTION_KEY = os.environ.get("MFA_ENCRYPTION_KEY", "")
ACCESS_TOKEN_EXPIRE_MINUTES = 60
MAX_BODY_BYTES = 6 * 1024 * 1024
MAX_IMAGE_BYTES = 5 * 1024 * 1024

if os.environ.get("PROXY_SHARED_SECRET") and len(os.environ["PROXY_SHARED_SECRET"]) < 32:
    raise RuntimeError("PROXY_SHARED_SECRET must contain at least 32 random characters.")

if os.getenv("APP_ENV") == "production":
    from urllib.parse import urlsplit
    origin = urlsplit(os.getenv("APP_ORIGIN", ""))
    if origin.scheme != "https" or not origin.netloc or origin.username or origin.password:
        raise RuntimeError("Set APP_ORIGIN to the HTTPS frontend origin in production.")
