"""Operator-only CLI to bootstrap/reset an account; never exposed as an API."""
import argparse
import getpass
from sqlmodel import Session, select
from app.database import engine, init_db
from app.models import User, Role
from app.auth import hash_password
from app.schemas import SignupIn


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("email")
    parser.add_argument("--name", default="Operator")
    parser.add_argument("--role", choices=[r.value for r in Role])
    args = parser.parse_args()
    password = getpass.getpass("New password (12–128 characters): ")
    if password != getpass.getpass("Confirm password: "):
        raise SystemExit("Passwords do not match.")
    data = SignupIn(name=args.name, email=args.email, password=password, locality="Operator")
    init_db()
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == str(data.email).lower())).first()
        if user is None:
            user = User(name=data.name, email=str(data.email).lower(), hashed_password=hash_password(password))
        else:
            user.hashed_password = hash_password(password)
        if args.role:
            user.role = Role(args.role)
        session.add(user)
        session.commit()
    print("Account updated. No password or token was logged.")


if __name__ == "__main__":
    main()
