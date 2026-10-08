"""Operator-configured account provisioning; no public provisioning endpoint."""
import os
from argon2 import extract_parameters, Type
from pydantic import TypeAdapter, EmailStr
from sqlalchemy import func
from sqlmodel import Session, select
from .models import User, Role


def provision_admin(engine):
    email = os.getenv("ADMIN_BOOTSTRAP_EMAIL", "")
    password_hash = os.getenv("ADMIN_BOOTSTRAP_PASSWORD_HASH", "")
    if not email and not password_hash:
        return
    if not email or not password_hash:
        raise RuntimeError("Admin provisioning requires both email and password hash.")
    email = str(TypeAdapter(EmailStr).validate_python(email)).lower()
    params = extract_parameters(password_hash)
    if params.type != Type.ID or params.memory_cost < 19456 or params.time_cost < 2:
        raise RuntimeError("Admin provisioning requires a strong Argon2id hash.")
    with Session(engine) as session:
        # Never overwrite an existing account, password, role, or MFA configuration.
        if session.exec(select(User).where(func.lower(User.email) == email)).first():
            return
        session.add(User(name=os.getenv("ADMIN_BOOTSTRAP_NAME", "Administrator"),
                         email=email, hashed_password=password_hash, role=Role.super_admin))
        session.commit()
