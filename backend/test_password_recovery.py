import time
from unittest.mock import patch
import pyotp
import pytest
from sqlmodel import Session, select
from test_security import setup, auth
from app.auth import verify_password
from app.models import User, UserMFA
from app.mfa import cipher
from app.password_recovery import PasswordResetChallenge, SUBJECT, digest
from app.product_models import EmailOutbox


@pytest.fixture
def mail_ready():
    with patch('app.password_recovery.email_available', return_value=True):
        yield


def issue(client, email='user@example.com', code=12345678):
    with patch('app.password_recovery.secrets.randbelow', return_value=code):
        return client.post('/auth/forgot-password', json={'email':email})


def reset(client, **values):
    return client.post('/auth/reset-password', json={'email':'user@example.com','code':'12345678',
        'new_password':'new-secure-password-456', **values})


def test_request_is_generic_and_does_not_expose_or_requeue_code(setup, mail_ready):
    client, engine, ids, *_ = setup
    known = issue(client)
    unknown = issue(client, 'missing@example.com')
    again = issue(client)
    assert known.status_code == unknown.status_code == again.status_code == 200
    assert known.json() == unknown.json() == again.json()
    assert '12345678' not in known.text and 'user@example.com' not in known.text
    with Session(engine) as session:
        challenge=session.get(PasswordResetChallenge,ids[0])
        assert challenge.digest == digest(ids[0],'12345678') and len(challenge.digest)==64
        assert len(session.exec(select(EmailOutbox).where(EmailOutbox.subject==SUBJECT)).all())==1


def test_reset_changes_hash_revokes_old_sessions_and_code_is_single_use(setup, mail_ready):
    client, engine, ids, *_ = setup
    old=auth(ids[0]); assert issue(client).status_code==200
    assert reset(client, code='00000000').status_code==400
    assert reset(client).status_code==200
    assert reset(client).status_code==400
    assert client.get('/auth/me',headers=old).status_code==401
    assert client.post('/auth/login',json={'email':'user@example.com','password':'secure-password-123'}).status_code==401
    logged=client.post('/auth/login',json={'email':'user@example.com','password':'new-secure-password-456'})
    assert logged.status_code==200
    assert client.get('/auth/me',headers={'Authorization':'Bearer '+logged.json()['access_token']}).status_code==200
    with Session(engine) as session:
        assert not session.get(PasswordResetChallenge,ids[0])
        assert verify_password('new-secure-password-456',session.get(User,ids[0]).hashed_password)


def test_attempt_limit_expiry_and_resend_replace_stale_recovery(setup, mail_ready):
    client, engine, ids, *_=setup
    issue(client)
    for _ in range(5): assert reset(client,code='00000000').status_code==400
    assert reset(client).status_code==400
    with Session(engine) as session:
        row=session.get(PasswordResetChallenge,ids[0]);row.expires_at=int(time.time())-1;row.attempts=0;session.add(row);session.commit()
    assert reset(client).status_code==400
    # Advance to the next rate-limit window instead of bypassing production limits.
    with patch('app.security.time.time', return_value=time.time()+61):
        assert issue(client,code=87654321).status_code==200
        assert reset(client).status_code==400
        assert reset(client,code='87654321').status_code==200
    with Session(engine) as session:
        assert not session.exec(select(EmailOutbox).where(EmailOutbox.subject==SUBJECT,EmailOutbox.status=='queued')).all()


def test_codes_are_bound_to_user_and_purpose(setup, mail_ready):
    client, *_=setup
    issue(client)
    assert reset(client,email='admin@example.com').status_code==400
    assert reset(client,email='missing@example.com').status_code==400
    assert reset(client,code='123456').status_code==422
    assert client.post('/account/email/verify',headers=auth(1),json={'code':'12345678'}).status_code==422


def test_mfa_is_required_and_preserved_after_password_reset(setup, mail_ready):
    client,engine,ids,*_=setup
    secret=pyotp.random_base32()
    with Session(engine) as session:
        session.add(UserMFA(user_id=ids[0],enabled=True,encrypted_secret=cipher().encrypt(secret.encode()).decode(),version='recovery-test'))
        session.commit()
    issue(client)
    assert reset(client).status_code==400
    assert reset(client,totp_code=pyotp.TOTP(secret).now()).status_code==200
    with Session(engine) as session:
        assert session.get(UserMFA,ids[0]).enabled
    assert client.post('/auth/login',json={'email':'user@example.com','password':'new-secure-password-456'}).status_code==401


def test_authenticated_password_change_cancels_pending_recovery(setup, mail_ready):
    client, *_=setup
    issue(client)
    assert client.post('/auth/password',headers=auth(1),json={'current_password':'secure-password-123','new_password':'another-secure-password-789'}).status_code==200
    assert reset(client).status_code==400


def test_unavailable_email_and_restricted_accounts_are_not_bypassed(setup, mail_ready):
    from app.safety import AccountRestriction
    client,engine,ids,*_=setup
    with patch('app.password_recovery.email_available',return_value=False):
        assert issue(client).status_code==503
        assert issue(client,'missing@example.com').status_code==503
    with Session(engine) as session:
        session.add(AccountRestriction(user_id=ids[0],state='suspended'));session.commit()
    assert issue(client).json()==issue(client,'missing@example.com').json()
    assert reset(client).status_code==400


def test_recovery_requests_are_rate_limited_and_validation_hides_password(setup, mail_ready):
    client,*_=setup
    for _ in range(10):assert issue(client,'missing@example.com').status_code==200
    assert issue(client,'missing@example.com').status_code==429
    response=reset(client,new_password='tiny-secret')
    assert response.status_code==422 and 'tiny-secret' not in response.text
