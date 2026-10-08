import io
import time
from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
import bcrypt
import jwt
import pyotp
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import StaticPool
from app import database, security, mfa
from app.main import app
from app.auth import hash_password, verify_password, create_access_token, SECRET_KEY, ALGORITHM
from app.database import get_session
from app.models import (User, Role, Locality, Post, PostType, PostStatus, ResponseRequest,
    RequestStatus, Message, UserMFA)


@pytest.fixture
def setup():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        loc = Locality(name="Gota, Ahmedabad")
        session.add(loc)
        session.flush()
        users = [User(name=r, email=f"{r.value}@example.com", hashed_password=hash_password("secure-password-123"),
                      role=r, locality_id=loc.id) for r in (Role.user, Role.admin, Role.super_admin)]
        session.add_all(users)
        session.flush()
        post = Post(owner_id=users[0].id, locality_id=loc.id, type=PostType.need_help,
                    title="Help carrying groceries", description="I need help carrying groceries home.", status=PostStatus.resolved)
        session.add(post)
        session.flush()
        rr = ResponseRequest(post_id=post.id, requester_id=users[1].id, message="Can help", status=RequestStatus.accepted)
        session.add(rr)
        session.flush()
        session.add(Message(response_request_id=rr.id, sender_id=users[0].id, text="Private message"))
        session.commit()
        ids = [u.id for u in users]
        post_id, rr_id = post.id, rr.id
    def session_dep():
        with Session(engine) as session:
            yield session
    app.dependency_overrides[get_session] = session_dep
    with patch.object(database, "engine", engine), patch.object(security, "engine", engine):
        with TestClient(app) as client:
            yield client, engine, ids, post_id, rr_id
    app.dependency_overrides.clear()
    engine.dispose()


def auth(user_id):
    return {"Authorization": "Bearer " + create_access_token({"sub": str(user_id)})}


def test_argon2_preserves_long_passwords():
    password = "a" * 80 + "b"
    hashed = hash_password(password)
    assert hashed.startswith("$argon2id$") and verify_password(password, hashed)
    assert not verify_password("a" * 80 + "c", hashed)
    assert not verify_password("hello", "invalid hash")


def test_missing_secret_fails_closed():
    import subprocess, os, sys
    result = subprocess.run([sys.executable, "-c", "import app.auth"], env={**os.environ, "JWT_SECRET_KEY": ""}, capture_output=True)
    assert result.returncode != 0 and b"JWT_SECRET_KEY" in result.stderr


@pytest.mark.parametrize("token", [
    jwt.encode({"sub": "1"}, SECRET_KEY, algorithm=ALGORITHM),
    create_access_token({"sub": "not-an-integer"}),
    create_access_token({"sub": "1"}, expires_delta=timedelta(seconds=-1)),
    jwt.encode({"sub": "1"}, "wrong-signing-key-that-is-long-enough", algorithm=ALGORITHM),
    jwt.encode({"sub": "1"}, "", algorithm="none"),
])
def test_invalid_jwt_rejected(setup, token):
    client, *_ = setup
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_logout_revokes_token(setup):
    client, _, ids, *_ = setup
    headers = auth(ids[0])
    assert client.get("/auth/me", headers=headers).status_code == 200
    assert client.post("/auth/logout", headers=headers).status_code == 200
    assert client.get("/auth/me", headers=headers).status_code == 401


def test_signup_validation_and_no_input_echo(setup):
    client, *_ = setup
    body = {"name": "New User", "email": "new@example.com", "password": "tiny-secret", "locality": "Gota"}
    response = client.post("/auth/signup", json=body)
    assert response.status_code == 422 and "tiny-secret" not in response.text
    body.update(password="secure-password-123", role="super_admin")
    assert client.post("/auth/signup", json=body).status_code == 422
    del body["role"]
    response = client.post("/auth/signup", json=body)
    assert response.status_code == 200
    assert client.get("/auth/me", headers={"Authorization": "Bearer " + response.json()["access_token"]}).json()["role"] == "user"


def test_bcrypt_migration(setup):
    client, engine, ids, *_ = setup
    with Session(engine) as session:
        user = session.get(User, ids[0])
        user.hashed_password = bcrypt.hashpw(b"secure-password-123", bcrypt.gensalt()).decode()
        session.add(user)
        session.commit()
    assert client.post("/auth/login", json={"email": "user@example.com", "password": "secure-password-123"}).status_code == 200
    with Session(engine) as session:
        assert session.get(User, ids[0]).hashed_password.startswith("$argon2id$")


def test_conversation_participants_only(setup):
    client, _, ids, _, rr_id = setup
    for user in ids[:2]:
        assert client.get(f"/requests/{rr_id}/messages", headers=auth(user)).status_code == 200
    for method in ("GET", "POST"):
        response = client.request(method, f"/requests/{rr_id}/messages", headers=auth(ids[2]), json={"text": "Intrusion"} if method == "POST" else None)
        assert response.status_code == 403
    assert client.get(f"/requests/{rr_id}/messages").status_code == 401


def test_roles_and_verification_server_enforced(setup):
    client, _, ids, *_ = setup
    assert client.get("/admin/users", headers=auth(ids[0])).status_code == 403
    assert client.patch(f"/admin/users/{ids[0]}/role", headers=auth(ids[1]), json={"role": "admin"}).status_code == 403
    response = client.post("/verification/submit", headers=auth(ids[1]), json={"proof_type": "Reference", "proof_value": "Reference"})
    assert response.status_code == 200
    assert client.patch(f"/admin/verifications/{response.json()['id']}", headers=auth(ids[1]), json={"approve": True}).status_code == 403
    assert client.get("/verification/mine", headers=auth(ids[0])).json() == []


def test_cors_and_response_headers(setup):
    client, *_ = setup
    response = client.options("/posts", headers={"Origin": "https://attacker.vercel.app", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in response.headers
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "no-store" in response.headers["cache-control"]


def test_body_limit(setup):
    client, *_ = setup
    assert client.post("/auth/login", content=b"x", headers={"Content-Length": str(7 * 1024 * 1024)}).status_code == 413


def png():
    stream = io.BytesIO()
    Image.new("RGB", (8, 8), "red").save(stream, format="PNG")
    return stream.getvalue()


@pytest.mark.parametrize("content", [b"<script>alert(1)</script>", b"<svg onload=alert(1)>", b"not an image"])
def test_fake_images_rejected(setup, content, tmp_path):
    client, _, ids, *_ = setup
    from app.routers import posts_router
    with patch.object(posts_router, "UPLOAD_DIR", str(tmp_path)):
        response = client.post("/posts/upload-image", headers=auth(ids[0]), files={"file": ("fake.png", content, "image/png")})
    assert response.status_code == 400 and not list(tmp_path.iterdir())


def test_image_reencoding_size_and_ownership(setup, tmp_path):
    client, _, ids, *_ = setup
    from app.routers import posts_router
    assert client.post("/posts/upload-image", files={"file": ("image.png", png())}).status_code == 401
    with patch.object(posts_router, "UPLOAD_DIR", str(tmp_path)):
        response = client.post("/posts/upload-image", headers=auth(ids[0]), files={"file": ("../../attack.html", png() + b"<script>attack</script>", "text/html")})
        assert response.status_code == 200
        image_url = response.json()["image_url"]
        content = next(tmp_path.iterdir()).read_bytes()
        assert b"<script>" not in content
        Image.open(io.BytesIO(content)).verify()
        assert client.post("/posts/upload-image", headers=auth(ids[0]), files={"file": ("big.png", b"x" * (5 * 1024 * 1024 + 1))}).status_code == 413
        body = {"type": "Need help", "title": "Help carrying groceries", "description": "I need help carrying groceries from the market.", "locality": "Gota", "image_url": image_url}
        assert client.post("/posts", headers=auth(ids[1]), json=body).status_code == 403
        body["image_url"] = "https://169.254.169.254/latest/meta-data"
        assert client.post("/posts", headers=auth(ids[0]), json=body).status_code == 422


def test_auth_rate_limit(setup):
    client, *_ = setup
    statuses = [client.post("/auth/login", json={"email": "unknown@example.com", "password": "incorrect"}).status_code for _ in range(11)]
    assert statuses[:10] == [401] * 10 and statuses[-1] == 429


def test_shared_limiter_is_atomic(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path}/limits.db", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with patch.object(security, "engine", engine):
        with ThreadPoolExecutor(max_workers=8) as executor:
            results = list(executor.map(lambda _: security.consume_bucket("same-client", 5, now=1234), range(20)))
        assert sum(results) == 5
        assert security.consume_bucket("same-client", 5, now=1300)
    engine.dispose()


def test_mfa_enrollment_and_replay_prevention(setup):
    client, engine, ids, *_ = setup
    old_headers = auth(ids[0])
    assert client.post("/auth/mfa/setup", headers=old_headers, json={"password": "wrong"}).status_code == 401
    response = client.post("/auth/mfa/setup", headers=old_headers, json={"password": "secure-password-123"})
    assert response.status_code == 200
    secret = response.json()["secret"]
    with Session(engine) as session:
        assert secret not in session.get(UserMFA, ids[0]).encrypted_secret
    now = int(time.time())
    with patch.object(mfa.time, "time", return_value=now):
        code = pyotp.TOTP(secret).at(now)
        response = client.post("/auth/mfa/confirm", headers=old_headers, json={"code": code})
        assert response.status_code == 200
        new_headers = {"Authorization": "Bearer " + response.json()["access_token"]}
        assert client.get("/auth/me", headers=old_headers).status_code == 401
        assert client.get("/auth/me", headers=new_headers).status_code == 200
        credentials = {"email": "user@example.com", "password": "secure-password-123"}
        assert client.post("/auth/login", json=credentials).status_code == 401
        assert client.post("/auth/login", json={**credentials, "totp_code": code}).status_code == 401
    future = now + 30
    with patch.object(mfa.time, "time", return_value=future):
        assert client.post("/auth/login", json={**credentials, "totp_code": pyotp.TOTP(secret).at(future)}).status_code == 200


def test_sql_injection_literals(setup):
    client, *_ = setup
    assert client.get("/posts", params={"locality": "' OR 1=1 --"}).json() == []
    assert client.get("/posts", params={"q": "' UNION SELECT password FROM user --"}).json() == []


def test_no_repeated_rating_credits(setup):
    client, engine, ids, post_id, *_ = setup
    assert client.post(f"/posts/{post_id}/rate", headers=auth(ids[1]), json={"stars": 5}).status_code == 200
    assert client.post(f"/posts/{post_id}/rate", headers=auth(ids[1]), json={"stars": 5}).status_code == 409
    with Session(engine) as session:
        assert session.get(User, ids[0]).credits == 0  # Ratings cannot mint exchange credits.


def test_demo_seed_disabled(setup):
    import seed
    with pytest.raises(RuntimeError, match="Demo seeding is disabled"):
        seed.run_seed()


def test_demo_password_is_rejected_even_with_existing_hash(setup):
    client, engine, ids, *_ = setup
    with Session(engine) as session:
        user = session.get(User, ids[0])
        user.hashed_password = bcrypt.hashpw(b"pass1234", bcrypt.gensalt()).decode()
        session.add(user)
        session.commit()
    assert client.post("/auth/login", json={"email": "user@example.com", "password": "pass1234"}).status_code == 401


def test_non_participant_cannot_rate_or_accept(setup):
    client, _, ids, post_id, rr_id = setup
    assert client.post(f"/posts/{post_id}/rate", headers=auth(ids[2]), json={"stars": 5}).status_code == 403
    assert client.patch(f"/requests/{rr_id}", headers=auth(ids[2]), json={"action": "accept"}).status_code == 403


def test_no_duplicate_admin_routes():
    routes = [(route.path, method) for route in app.routes if hasattr(route, "methods") for method in route.methods]
    assert len(routes) == len(set(routes))


def test_password_change_invalidates_all_old_sessions(setup):
    client, engine, ids, *_ = setup
    old = auth(ids[0])
    denied = client.post('/auth/password', headers=old, json={
        'current_password': 'wrong-password', 'new_password': 'new-strong-password-123'})
    assert denied.status_code == 401
    assert client.get('/auth/me', headers=old).status_code == 200
    result = client.post('/auth/password', headers=old, json={
        'current_password': 'secure-password-123', 'new_password': 'new-strong-password-123'})
    assert result.status_code == 200
    assert client.get('/auth/me', headers=old).status_code == 401
    new = {'Authorization': 'Bearer ' + result.json()['access_token']}
    assert client.get('/auth/me', headers=new).status_code == 200
    assert client.post('/auth/login', json={'email': 'user@example.com', 'password': 'secure-password-123'}).status_code == 401
    login = client.post('/auth/login', json={'email': 'user@example.com', 'password': 'new-strong-password-123'})
    assert login.status_code == 200
    assert client.get('/auth/me', headers={'Authorization': 'Bearer ' + login.json()['access_token']}).status_code == 200


def test_admin_provisioning_is_private_idempotent_and_preserves_existing_accounts(setup, monkeypatch):
    from app.bootstrap import provision_admin
    client, engine, ids, *_ = setup
    monkeypatch.setenv('ADMIN_BOOTSTRAP_EMAIL', 'operator@example.com')
    monkeypatch.setenv('ADMIN_BOOTSTRAP_PASSWORD_HASH', hash_password('operator-secret-password'))
    provision_admin(engine)
    provision_admin(engine)
    from sqlmodel import select
    with Session(engine) as session:
        accounts = session.exec(select(User).where(User.email == 'operator@example.com')).all()
        assert len(accounts) == 1 and accounts[0].role == Role.super_admin
    monkeypatch.setenv('ADMIN_BOOTSTRAP_EMAIL', 'user@example.com')
    provision_admin(engine)
    with Session(engine) as session:
        user = session.get(User, ids[0])
        assert user.role == Role.user and verify_password('secure-password-123', user.hashed_password)
    monkeypatch.setenv('ADMIN_BOOTSTRAP_PASSWORD_HASH', bcrypt.hashpw(b'secret', bcrypt.gensalt()).decode())
    with pytest.raises(Exception):
        provision_admin(engine)
