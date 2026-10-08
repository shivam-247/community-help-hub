"""Test-only keys; production must supply its own secrets."""
import os
import secrets
from cryptography.fernet import Fernet
os.environ.setdefault("JWT_SECRET_KEY", secrets.token_urlsafe(48))
os.environ.setdefault("MFA_ENCRYPTION_KEY", Fernet.generate_key().decode())
os.environ["APP_ENV"] = "test"
