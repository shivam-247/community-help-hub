from datetime import datetime, timedelta, timezone
from unittest.mock import patch
import secrets
import pytest
from sqlmodel import Session, select
from sqlalchemy.exc import OperationalError
from test_security import setup, auth, verify_publisher
from test_product import valid_post
from app.models import Post, User, Message
from app.product_models import Subscription, PostUsage, PaymentReference
from app.product import period
from app.schemas import SignupIn


def test_feed_has_sql_pagination_stable_pages_and_no_duplicates(setup):
    client,engine,ids,_,_=setup
    with Session(engine) as s:
        owner=s.get(User,ids[0])
        for i in range(27):
            s.add(Post(owner_id=owner.id,locality_id=owner.locality_id,type='Offer help',title=f'Neighbourhood books collection {i}',description='Books available for neighbours to collect this weekend.'))
        s.commit()
    first=client.get('/posts/feed?page_size=10&sort=newest').json()
    second=client.get('/posts/feed?page_size=10&sort=newest&page=2').json()
    assert first['total']==28 and first['has_more'] and len(first['items'])==10
    assert not ({p['id'] for p in first['items']}&{p['id'] for p in second['items']})
    assert len(client.get('/posts').json())==20
    assert client.get('/posts?page_size=500').status_code==422
    assert client.get('/posts/feed?page=0').status_code==422
    assert client.get('/posts/feed?sort=sql').status_code==422
    assert client.get('/posts/feed?page=999').json()['items']==[]
    assert client.get('/posts/feed?q=%25').json()['total']==0
    assert client.get('/posts/feed?locality=not-a-real-area').json()['total']==0


def test_paid_unlimited_expiry_quota_and_no_purchase_verification(setup):
    client,engine,ids,*_=setup
    with patch.dict('os.environ',{'MOCK_CHECKOUT_ENABLED':'true'}):
        checkout=client.post('/billing/checkout',headers=auth(ids[0]),json={'plan':'plus','checkout_key':secrets.token_hex(16)})
        assert checkout.status_code==200
    with Session(engine) as s:
        row=s.exec(select(PaymentReference)).one()
        assert row.provider=='mock' and row.state=='simulated'
        s.add(PostUsage(user_id=ids[0],period=period(),count=500));s.commit()
    assert client.post('/posts',headers=auth(ids[0]),json=valid_post()).status_code==403
    assert client.get('/auth/me',headers=auth(ids[0])).json()['verification_status']!='verified'
    verify_publisher(client, ids, ids[0])
    assert client.post('/posts',headers=auth(ids[0]),json=valid_post()).status_code==200
    assert client.get('/billing',headers=auth(ids[0])).json()['limit'] is None
    with Session(engine) as s:
        sub=s.get(Subscription,ids[0]);sub.expires_at=datetime.now(timezone.utc)-timedelta(days=1);s.add(sub);s.commit()
    assert client.get('/billing',headers=auth(ids[0])).json()['plan']=='free'
    assert client.post('/posts',headers=auth(ids[0]),json=valid_post()).status_code==429


def test_pagination_headers_and_private_message_cursor(setup):
    client,engine,ids,_,rr=setup
    with Session(engine) as s:
        for i in range(43):s.add(Message(response_request_id=rr,sender_id=ids[0],text=f'Test message {i}'))
        s.commit()
    first=client.get(f'/requests/{rr}/messages?page_size=10',headers=auth(ids[0]))
    assert len(first.json())==10 and first.headers['x-has-more']=='true'
    assert first.json()[0]['id']<first.json()[-1]['id']
    previous=client.get(f"/requests/{rr}/messages?before_id={first.json()[0]['id']}&page_size=10",headers=auth(ids[0])).json()
    assert max(m['id'] for m in previous)<first.json()[0]['id']
    assert client.get('/admin/users?page_size=1',headers=auth(ids[1])).headers['x-has-more']=='true'


def test_plain_text_normalisation_preserves_passwords_and_indian_text():
    password='  long<&> password 1234  '
    user=SignupIn(name='<b>શિવમ</b>\x00',email='test@example.com',password=password,locality='Gota',privacy_consent=True,terms_accepted=True,adult_confirmed=True,policy_version='2026-10-10')
    assert user.name=='શિવમ' and user.password==password
    with pytest.raises(ValueError):SignupIn(name='<script>bad</script>',email='test@example.com',password=password,locality='Gota',privacy_consent=True,terms_accepted=True,adult_confirmed=True,policy_version='2026-10-10')


def test_global_error_handler_masks_errors_and_database_failures(setup):
    client,_,ids,*_=setup
    verify_publisher(client, ids, ids[0])
    with patch('app.routers.posts_router.ml_engine.validate_post_quality',side_effect=RuntimeError('private-password-and-stack-secret')):
        error=client.post('/posts',headers=auth(ids[0]),json=valid_post())
    assert error.status_code==500 and 'private-password' not in error.text
    assert error.json()['request_id']==error.headers['x-request-id']
    with patch('app.security.consume_bucket',side_effect=OperationalError('SELECT secret',{'password':'private-password'},Exception('private-password'))):
        error=client.get('/posts/feed')
    assert error.status_code==503 and 'private-password' not in error.text
    assert client.get('/health').json()['status']=='ok'
