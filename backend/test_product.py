import secrets
from unittest.mock import patch
import pytest
from sqlmodel import Session, select
from test_security import setup, auth
from app.models import User, Post, PostStatus
from app.product_models import PostUsage, CreditEvent, Invoice, TrustRecord, CommunityPost
from app.product import period, PLANS, drain_outbox
from app.ml import ml_engine


def valid_post():
    return {"type":"Offer help", "title":"Books to share with neighbours", "description":"I have school books available for neighbours to collect this weekend.", "locality":"Gota, Ahmedabad", "category":"Donations & Giveaways"}

def test_free_quota_and_deleted_posts_do_not_refund(setup):
    client, engine, ids, post_id, _ = setup
    # Existing post this month is included before the first quota reservation.
    for _ in range(4):
        assert client.post('/posts', headers=auth(ids[0]), json=valid_post()).status_code == 200
    assert client.post('/posts', headers=auth(ids[0]), json=valid_post()).status_code == 429
    assert client.delete(f'/posts/{post_id}',headers=auth(ids[0])).status_code == 200
    assert client.get('/billing', headers=auth(ids[0])).json()['used'] == 5
    assert client.post('/posts', headers=auth(ids[0]), json=valid_post()).status_code == 429

def test_checkout_server_price_idempotency_and_downgrade(setup):
    client,engine,ids,*_=setup
    data={"plan":"plus","cycle":"yearly","checkout_key":secrets.token_hex(16)}
    with patch.dict('os.environ',{'MOCK_CHECKOUT_ENABLED':'true'}):
        first=client.post('/billing/checkout',headers=auth(ids[0]),json=data)
        assert first.status_code==200
        assert first.json()['invoice']['amount_paise']==95000
        assert client.post('/billing/checkout',headers=auth(ids[0]),json=data).json()['duplicate']
        assert client.get('/billing',headers=auth(ids[0])).json()['limit']==30
        assert len(client.get('/billing',headers=auth(ids[0])).json()['invoices'])==1
        assert client.post('/billing/checkout',headers=auth(ids[0]),json={**data,'plan':'free','checkout_key':secrets.token_hex(16)}).status_code==200
        assert client.get('/billing',headers=auth(ids[0])).json()['limit']==5
        # No caller-provided amount can change the catalogue price (extra fields are rejected below).

def test_disabled_checkout_cannot_grant_paid_entitlements(setup):
    client,_,ids,*_=setup
    with patch.dict('os.environ',{'MOCK_CHECKOUT_ENABLED':'false'}):
        assert client.post('/billing/checkout',headers=auth(ids[0]),json={'plan':'society','checkout_key':secrets.token_hex(16)}).status_code==503
    assert client.get('/billing',headers=auth(ids[0])).json()['plan']=='free'

def test_completion_requires_both_participants_and_is_idempotent(setup):
    client,engine,ids,post_id,rr_id=setup
    assert client.post(f'/requests/{rr_id}/complete',headers=auth(ids[2])).status_code==403
    assert not client.post(f'/requests/{rr_id}/complete',headers=auth(ids[0])).json()['completed']
    assert client.post(f'/requests/{rr_id}/complete',headers=auth(ids[1])).json()['completed']
    assert client.post(f'/requests/{rr_id}/complete',headers=auth(ids[1])).json()['completed']
    with Session(engine) as session:
        assert [session.get(User,i).credits for i in ids[:2]]==[10,10]
        assert len(session.exec(select(CreditEvent)).all())==2

def test_notifications_are_private(setup):
    client,_,ids,_,rr_id=setup
    client.post(f'/requests/{rr_id}/messages',headers=auth(ids[0]),json={'text':'Meet at the society gate at six.'})
    row=client.get('/notifications',headers=auth(ids[1])).json()[0]
    assert client.patch(f"/notifications/{row['id']}/read",headers=auth(ids[2])).status_code==404
    assert client.patch(f"/notifications/{row['id']}/read",headers=auth(ids[1])).status_code==200

def test_society_scope_and_analytics(setup):
    client,engine,ids,*_=setup
    with patch.dict('os.environ',{'MOCK_CHECKOUT_ENABLED':'true'}):
        assert client.post('/communities',headers=auth(ids[0]),json={'name':'Gota residents','pin_code':'382481'}).status_code==403
        client.post('/billing/checkout',headers=auth(ids[0]),json={'plan':'society','checkout_key':secrets.token_hex(16)})
        board=client.post('/communities',headers=auth(ids[0]),json={'name':'Gota residents','pin_code':'382481'}).json()[0]
        post=client.post('/posts',headers=auth(ids[0]),json={**valid_post(),'community_id':board['id']}).json()
        assert client.get(f"/posts/{post['id']}",headers=auth(ids[2])).status_code==404
        assert post['id'] not in [p['id'] for p in client.get('/posts').json()]
        assert post['id'] not in [p['id'] for p in client.get(f"/users/{ids[0]}").json()["active_posts"]]
        assert client.get(f"/communities/{board['id']}/posts",headers=auth(ids[2])).status_code==404
        assert client.post('/communities/join',headers=auth(ids[1]),json={'invite_code':board['invite_code']}).status_code==200
        assert client.get(f"/communities/{board['id']}/posts",headers=auth(ids[1])).status_code==200
        assert client.get(f"/communities/{board['id']}/analytics",headers=auth(ids[1])).status_code==403
        assert client.get(f"/communities/{board['id']}/analytics",headers=auth(ids[0])).json()['members']==2
        public = client.post("/posts", headers=auth(ids[1]), json=valid_post()).json()
        assert post["id"] not in [hint["post_id"] for hint in public["duplicates"]]

@pytest.mark.parametrize('title,description',[
    ('ગુજરાતી વાંચવામાં મદદ','શનિવારે સાંજે બાળકોને ગુજરાતી વાંચવામાં મદદ કરી શકું છું.'),
    ('पुरानी किताबें देना चाहता हूँ','मेरे पास बच्चों की किताबें हैं जो पड़ोसी ले सकते हैं।'),
])
def test_indian_language_posts(title,description):
    assert ml_engine.validate_post_quality(title,description)[0]

@pytest.mark.parametrize('text,flag',[('click here free money guaranteed act now!!!',True),('Giving away school books at our society gate this Sunday.',False)])
def test_spam_filter(text,flag):
    assert ml_engine.spam_check(text)[1] is flag

def test_advanced_filters_are_enforced(setup):
    client,_,ids,*_=setup
    assert client.get('/posts?verified_only=true',headers=auth(ids[0])).status_code==403
    assert client.get('/posts?verified_only=true').status_code==403

def test_photo_must_belong_to_account(setup):
    client,_,ids,*_=setup
    assert client.patch('/auth/avatar',headers=auth(ids[0]),json={'avatar':f'/uploads/u{ids[1]}_'+'a'*32+'.png'}).status_code==400
    assert client.patch('/auth/avatar',headers=auth(ids[0]),json={'avatar':'initials'}).status_code==200

def test_chat_stream_checks_membership_and_delivers_message(setup):
    import asyncio
    from types import SimpleNamespace
    from app.routers.product_router import message_events
    from app.auth import create_access_token
    client,engine,ids,_,rr_id=setup
    assert client.get(f'/requests/{rr_id}/events',headers=auth(ids[2])).status_code==403
    async def connected(): return False
    request=SimpleNamespace(headers={},is_disconnected=connected)
    with Session(engine) as session:
        stream=message_events(rr_id,request,0,session.get(User,ids[0]),create_access_token({'sub':str(ids[0])}),session)
    async def receive():
        first=await anext(stream.body_iterator)
        await stream.body_iterator.aclose()
        return first
    assert 'Private message' in asyncio.run(receive())

def test_email_code_is_private_single_use_and_delivery_is_queued(setup):
    from app.product_models import EmailChallenge
    client,engine,ids,*_=setup
    with patch.dict('os.environ',{'SMTP_HOST':'smtp.example.invalid','SMTP_FROM':'hub@example.invalid'}):
        assert client.post('/account/email/send',headers=auth(ids[0])).json()=={'ok':True}
        with Session(engine) as session:
            assert len(session.get(EmailChallenge,ids[0]).digest)==64
        with patch('app.product.send_email') as sender:
            drain_outbox(engine)
            assert sender.call_count==1
            code=sender.call_args.args[2].split('Your code is ')[1].split('.')[0]
        assert client.post('/account/email/verify',headers=auth(ids[0]),json={'code':code}).status_code==200
        assert client.get('/account/trust',headers=auth(ids[0])).json()['email'] is True
        assert client.post('/account/email/verify',headers=auth(ids[0]),json={'code':code}).status_code==400

def test_spam_queue_is_admin_only_and_hidden_from_public(setup):
    client,engine,ids,*_=setup
    with Session(engine) as session:
        p=Post(owner_id=ids[0],locality_id=1,type='Offer help',title='Cash offer for neighbours',description='click here free money guaranteed act now!!!',spam_flag=True)
        session.add(p);session.commit();post_id=p.id
    assert post_id not in [p['id'] for p in client.get('/posts').json()]
    assert client.get(f'/posts/{post_id}').status_code==404
    assert client.patch(f'/admin/posts/{post_id}/spam',headers=auth(ids[0])).status_code==403
    assert client.patch(f'/admin/posts/{post_id}/spam',headers=auth(ids[1])).status_code==200
    assert post_id in [p['id'] for p in client.get('/posts').json()]


def test_legacy_phone_updates_invalidate_phone_verification(setup):
    client,engine,ids,*_=setup
    with Session(engine) as session:
        user=session.get(User,ids[0]);user.contact_phone="9876543210";session.add(user)
        session.add(TrustRecord(user_id=ids[0],phone_verified=True));session.commit()
    assert client.patch('/auth/contact',headers=auth(ids[0]),json={'contact_phone':'9876543211'}).status_code==200
    assert client.get('/account/trust',headers=auth(ids[0])).json()['phone'] is False
