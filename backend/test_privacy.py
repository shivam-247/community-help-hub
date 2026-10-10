import io
import secrets
from sqlmodel import Session, select
from test_security import setup, auth, png
from app.models import User, Post, Role, Rating
from app.product_models import AccountConsent, Community, CommunityMember, CommunityPost
from app.auth import hash_password


def test_signup_consent_required_versioned_and_not_prechecked(setup):
    client, engine, *_ = setup
    body={"name":"Neighbour", "email":"neighbour@example.com", "password":"secure-password-123", "locality":"Gota"}
    assert client.post('/auth/signup',json=body).status_code == 422
    body.update(privacy_consent=True,terms_accepted=True,adult_confirmed=True,policy_version="2026-10-10")
    for key in ['privacy_consent','terms_accepted','adult_confirmed']:
        assert client.post('/auth/signup',json={**body,key:False}).status_code == 422
    assert client.post('/auth/signup',json={**body,'policy_version':'obsolete'}).status_code == 422
    assert client.post('/auth/signup',json=body).status_code == 200
    with Session(engine) as s:
        u=s.exec(select(User).where(User.email == body['email'])).one()
        record=s.get(AccountConsent,u.id)
        assert record.policy_version == '2026-10-10' and record.privacy_consent and record.terms_accepted
        assert record.adult_confirmed and record.accepted_at


def test_government_document_submission_is_rejected(setup):
    client, _, ids, *_ = setup
    for kind in ['Government ID','Certificate']:
        assert client.post('/verification/submit',headers=auth(ids[0]),json={'proof_type':kind,'proof_value':'unnecessary document'}).status_code == 422
    assert client.post('/verification/submit',headers=auth(ids[0]),json={'proof_type':'Reference','proof_value':'1234 5678 9012'}).status_code == 422
    assert client.post('/verification/submit',headers=auth(ids[0]),json={'proof_type':'Reference','proof_value':'Society secretary has agreed to vouch for me.'}).status_code == 200


def test_image_visibility_matches_private_post_and_avatar_publication(setup):
    client, engine, ids, post_id, _ = setup
    upload=client.post('/posts/upload-image',headers=auth(ids[0]),files={'file':('item.png',png(),'image/png')})
    assert upload.status_code == 200
    url=upload.json()['image_url']
    assert client.get(url).status_code == 404
    assert client.get(url,headers=auth(ids[0])).status_code == 200
    with Session(engine) as s:
        outsider=User(name='Outsider',email='outside@example.com',hashed_password=hash_password('secure-password-123'),role=Role.user)
        s.add(outsider);s.flush();outside_id=outsider.id
        p=s.get(Post,post_id);p.image_url=url;s.add(p);s.commit()
    assert client.get(url).status_code == 200
    with Session(engine) as s:
        board=Community(owner_id=ids[0],name='Gota society',pin_code='382481',invite_code=secrets.token_urlsafe(12));s.add(board);s.flush()
        s.add(CommunityPost(post_id=post_id,community_id=board.id))
        s.add(CommunityMember(community_id=board.id,user_id=ids[0]));s.commit()
    assert client.get(url).status_code == 404
    assert client.get(url,headers=auth(outside_id)).status_code == 404
    assert client.get(url,headers=auth(ids[0])).status_code == 200
    assert client.get(url,headers=auth(ids[1])).status_code == 200 # authorised admin
    with Session(engine) as s:
        u=s.get(User,ids[0]);u.avatar=url;s.add(u);s.commit()
    assert client.get(url).status_code == 200 # explicitly public profile photo
