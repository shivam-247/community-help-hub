from unittest.mock import patch
from sqlmodel import Session, select
from test_security import setup, auth, verify_publisher
from test_product import valid_post
from app.models import User, Post
from app.product_models import TrustRecord, PostUsage, EmailChallenge


def test_unverified_accounts_including_staff_cannot_publish_or_consume_quota(setup):
    client, engine, ids, *_ = setup
    with Session(engine) as session:
        before = len(session.exec(select(Post)).all())
    for uid in ids:
        assert not client.get('/account/trust', headers=auth(uid)).json()['can_post']
        response = client.post('/posts', headers=auth(uid), json=valid_post())
        assert response.status_code == 403 and 'Community verification' in response.json()['detail']
    with Session(engine) as session:
        assert len(session.exec(select(Post)).all()) == before
        assert not session.exec(select(PostUsage)).all()


def test_approval_unlocks_posting_and_pending_rejected_or_revoked_checks_do_not(setup):
    client, engine, ids, *_ = setup
    for status in ['pending', 'rejected', 'verified']:
        with Session(engine) as session:
            user = session.get(User, ids[0]); user.verification_status = status
            session.add(user); session.commit()
        assert client.post('/posts', headers=auth(ids[0]), json=valid_post()).status_code == 403
    with Session(engine) as session:
        user = session.get(User, ids[0]); user.verification_status = 'unverified'
        session.add(user); session.commit()
    verify_publisher(client, ids, ids[0])
    assert client.get('/account/trust', headers=auth(ids[0])).json()['can_post']
    assert client.post('/posts', headers=auth(ids[0]), json=valid_post()).status_code == 200
    assert client.patch(f'/admin/users/{ids[0]}/trust', headers=auth(ids[1]), json={
        'phone_verified': False, 'address_verified': False, 'note': 'Residency is no longer independently confirmed.'
    }).status_code == 200
    assert client.post('/posts', headers=auth(ids[0]), json=valid_post()).status_code == 403
    assert client.get('/auth/me', headers=auth(ids[0])).json()['verification_status'] == 'unverified'


def test_email_otp_alone_does_not_grant_community_approval(setup):
    client, engine, ids, *_ = setup
    with Session(engine) as session:
        session.add(TrustRecord(user_id=ids[0], email_verified=True)); session.commit()
    assert client.post('/posts', headers=auth(ids[0]), json=valid_post()).status_code == 403
    with patch.dict('os.environ', {'SMTP_HOST': '', 'SMTP_FROM': ''}):
        assert client.post('/account/email/send', headers=auth(ids[0])).status_code == 503
    assert client.get('/auth/me', headers=auth(ids[0])).json()['verification_status'] == 'unverified'


def test_signup_otp_cooldown_attempt_limit_and_expiry(setup):
    client, engine, ids, *_ = setup
    with patch.dict('os.environ', {'SMTP_HOST': 'smtp.example.invalid', 'SMTP_FROM': 'hub@example.invalid'}):
        with patch('app.routers.product_router.secrets.randbelow', return_value=123456):
            assert client.post('/account/email/send', headers=auth(ids[0])).status_code == 200
        assert client.post('/account/email/send', headers=auth(ids[0])).status_code == 429
        assert client.post('/account/email/verify', headers=auth(ids[1]), json={'code':'123456'}).status_code == 400
        for _ in range(5):
            assert client.post('/account/email/verify', headers=auth(ids[0]), json={'code':'000000'}).status_code == 400
        assert client.post('/account/email/verify', headers=auth(ids[0]), json={'code':'123456'}).status_code == 400
        with Session(engine) as session:
            row = session.get(EmailChallenge, ids[0]); row.expires_at = 1; row.attempts = 0
            session.add(row); session.commit()
        assert client.post('/account/email/verify', headers=auth(ids[0]), json={'code':'123456'}).status_code == 400
        assert not client.get('/account/trust', headers=auth(ids[0])).json()['email']
