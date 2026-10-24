import asyncio
from types import SimpleNamespace
from sqlmodel import Session, select
from test_security import setup, auth
from app.models import User, Post, Message, ResponseRequest
from app.product_models import Invoice
from app.safety import ModerationEvent, ExchangeClosure


def test_both_confirmations_close_all_chat_paths_and_purge_history(setup):
    client, engine, ids, post_id, rr_id = setup
    assert not client.post(f"/requests/{rr_id}/complete", headers=auth(ids[0])).json()["completed"]
    assert client.get(f"/requests/{rr_id}/messages", headers=auth(ids[1])).status_code == 200
    assert client.post(f"/requests/{rr_id}/complete", headers=auth(ids[1])).json()["chat_closed"]
    for uid in ids[:2]:
        assert client.get(f"/requests/{rr_id}/state", headers=auth(uid)).json()["closed"]
        assert client.get(f"/requests/{rr_id}/messages", headers=auth(uid)).status_code == 410
        assert client.post(f"/requests/{rr_id}/messages", headers=auth(uid), json={"text":"Blocked after completion"}).status_code == 410
        assert client.get(f"/requests/{rr_id}/events", headers=auth(uid)).status_code == 410
    with Session(engine) as session:
        assert not session.exec(select(Message).where(Message.response_request_id == rr_id)).all()
        assert session.get(ExchangeClosure, rr_id)
    assert client.get("/inbox/sent", headers=auth(ids[1])).json()[0]["chat_closed"]
    client.patch(f"/posts/{post_id}/status", headers=auth(ids[0]), json={"status":"Open"})
    assert client.post(f"/requests/{rr_id}/messages", headers=auth(ids[0]), json={"text":"Still blocked"}).status_code == 410


def test_open_sse_connection_receives_closure_event(setup):
    from app.auth import create_access_token
    from app.routers.product_router import message_events
    client, engine, ids, _, rr_id = setup
    async def connected(): return False
    request = SimpleNamespace(headers={}, is_disconnected=connected)
    with Session(engine) as session:
        stream = message_events(rr_id, request, 0, session.get(User, ids[0]), create_access_token({"sub":str(ids[0])}), session)
    client.post(f"/requests/{rr_id}/complete", headers=auth(ids[0]))
    client.post(f"/requests/{rr_id}/complete", headers=auth(ids[1]))
    async def first():
        result = await anext(stream.body_iterator)
        await stream.body_iterator.aclose()
        return result
    assert "event: exchange_closed" in asyncio.run(first())


def test_rating_targets_peer_and_never_self(setup):
    client, engine, ids, post_id, rr_id = setup
    assert client.get(f"/posts/{post_id}/rating-eligibility", headers=auth(ids[0])).json()["target_name"] == "admin"
    assert not client.get(f"/posts/{post_id}/rating-eligibility", headers=auth(ids[2])).json()["can_rate"]
    with Session(engine) as session:
        rr = session.get(ResponseRequest, rr_id); rr.requester_id = ids[0]; session.add(rr); session.commit()
    assert not client.get(f"/posts/{post_id}/rating-eligibility", headers=auth(ids[0])).json()["can_rate"]
    assert client.post(f"/posts/{post_id}/rate", headers=auth(ids[0]), json={"stars":5}).status_code == 400


def test_reference_approval_updates_progress_but_saved_phone_is_not_verified(setup):
    client, _, ids, *_ = setup
    profile = {"name":"Test Member","locality":"Gota, Ahmedabad","contact_phone":"9876543210"}
    assert client.patch("/account/profile", headers=auth(ids[0]), json=profile).status_code == 200
    trust = client.get("/account/trust", headers=auth(ids[0])).json()
    assert trust["phone_saved"] and not trust["phone"]
    case = client.post("/verification/submit", headers=auth(ids[0]), json={"proof_type":"Reference","proof_value":"Our society secretary agreed to vouch for my residency."}).json()
    result = client.patch(f"/admin/verifications/{case['id']}", headers=auth(ids[1]), json={"approve":True,"reviewer_comment":"Society secretary independently confirmed residency."})
    assert result.status_code == 200, result.text
    trust = client.get("/account/trust", headers=auth(ids[0])).json()
    assert trust["community"] and not trust["phone"] and not trust["email"]
    assert client.patch(f"/admin/users/{ids[0]}/trust", headers=auth(ids[1]), json={"phone_verified":True,"address_verified":True,"note":"Society reference and phone independently confirmed."}).status_code == 200
    assert client.get("/account/trust", headers=auth(ids[0])).json()["phone"]
    client.patch("/account/profile", headers=auth(ids[0]), json={**profile,"contact_phone":"9876543211"})
    assert not client.get("/account/trust", headers=auth(ids[0])).json()["phone"]
    assert client.get("/account/trust", headers=auth(ids[1])).json()["staff_access"]


def test_staff_plan_grants_are_audited_not_paid_invoices(setup):
    client, engine, ids, *_ = setup
    body = {"plan":"plus","days":7,"note":"College demo access approved by moderator."}
    assert client.patch(f"/admin/users/{ids[0]}/plan", headers=auth(ids[0]), json=body).status_code == 403
    assert client.patch(f"/admin/users/{ids[0]}/plan", headers=auth(ids[1]), json=body).status_code == 200
    assert client.get("/billing", headers=auth(ids[0])).json()["plan"] == "plus"
    with Session(engine) as session:
        assert not session.exec(select(Invoice)).all()
        assert session.exec(select(ModerationEvent).where(ModerationEvent.action == "plan_changed")).first()
    assert client.patch(f"/admin/users/{ids[0]}/plan", headers=auth(ids[1]), json={**body,"days":999}).status_code == 422


def test_user_report_privacy_independent_review_and_duplicate_guard(setup):
    client, _, ids, _, rr_id = setup
    body = {"reason":"This member sent suspicious requests in our exchange.","request_id":rr_id}
    result = client.post(f"/users/{ids[1]}/report", headers=auth(ids[0]), json=body)
    assert result.status_code == 200, result.text
    assert result.json()["case_id"].startswith("USR-")
    assert client.post(f"/users/{ids[1]}/report", headers=auth(ids[0]), json=body).json()["duplicate"]
    assert client.get("/admin/user-reports", headers=auth(ids[0])).status_code == 403
    row = client.get("/admin/user-reports", headers=auth(ids[2])).json()[0]
    review = {"status":"Reviewed","note":"Checked the reported behaviour and recorded the outcome."}
    assert client.patch(f"/admin/user-reports/{row['id']}", headers=auth(ids[1]), json=review).status_code == 403
    assert client.patch(f"/admin/user-reports/{row['id']}", headers=auth(ids[2]), json=review).status_code == 200
    assert client.post(f"/users/{ids[0]}/report", headers=auth(ids[0]), json=body).status_code == 400
    assert client.post(f"/users/{ids[0]}/report", headers=auth(ids[2]), json=body).status_code == 403


def test_suspension_revokes_sessions_and_protects_staff(setup):
    client, _, ids, _, rr_id = setup
    old = auth(ids[0]); body = {"state":"suspended","note":"Reviewed report of repeated harassment and spam."}
    assert client.patch(f"/admin/users/{ids[1]}/restriction", headers=auth(ids[1]), json=body).status_code == 403
    assert client.patch(f"/admin/users/{ids[0]}/restriction", headers=auth(ids[1]), json=body).status_code == 200
    assert client.get("/auth/me", headers=old).status_code in (401,403)
    assert client.post(f"/requests/{rr_id}/complete", headers=auth(ids[1])).status_code == 403
    assert client.post("/auth/login", json={"email":"user@example.com","password":"secure-password-123"}).status_code == 401
    assert client.patch(f"/admin/users/{ids[0]}/restriction", headers=auth(ids[1]), json={**body,"state":"active"}).status_code == 200
    assert client.get("/auth/me", headers=old).status_code == 401


def test_deletion_is_super_admin_only_and_cannot_be_restored(setup):
    client, engine, ids, post_id, _ = setup
    body = {"confirmation":"DELETE","note":"Confirmed account removal following safety review."}
    assert client.post(f"/admin/users/{ids[0]}/delete", headers=auth(ids[1]), json=body).status_code == 403
    result = client.post(f"/admin/users/{ids[0]}/delete", headers=auth(ids[2]), json=body)
    assert result.status_code == 200, result.text
    assert client.get(f"/users/{ids[0]}").status_code == 404
    with Session(engine) as session:
        assert session.get(User, ids[0]).email.endswith("@example.invalid")
        assert not session.get(Post, post_id)
    assert client.patch(f"/admin/users/{ids[0]}/restriction", headers=auth(ids[2]), json={"state":"active","note":"An attempted restore of a deleted account."}).status_code == 409


def test_existing_completed_chats_are_backfilled_without_extra_credits(setup):
    from app.product_models import CompletionConfirmation
    from app.safety import purge_completed_chats
    _, engine, ids, post_id, rr_id = setup
    purge_completed_chats(engine)
    with Session(engine) as session:
        assert len(session.exec(select(Message)).all()) == 1
        session.add(CompletionConfirmation(post_id=post_id, user_id=ids[0])); session.commit()
    purge_completed_chats(engine)
    with Session(engine) as session:
        assert len(session.exec(select(Message)).all()) == 1
        session.add(CompletionConfirmation(post_id=post_id, user_id=ids[1])); session.commit()
    purge_completed_chats(engine)
    with Session(engine) as session:
        assert not session.exec(select(Message)).all()
        assert session.get(ExchangeClosure, rr_id)
        assert session.get(User, ids[0]).credits == 0


def test_area_change_invalidates_pending_reference_before_any_trust_record(setup):
    client, _, ids, *_ = setup
    proof = {"proof_type":"Reference","proof_value":"The society secretary agrees to vouch for this member."}
    row = client.post("/verification/submit", headers=auth(ids[0]), json=proof).json()
    assert client.patch("/account/profile", headers=auth(ids[0]), json={"name":"Member","locality":"New neighbourhood"}).status_code == 200
    assert client.patch(f"/admin/verifications/{row['id']}", headers=auth(ids[1]), json={"approve":True}).status_code == 400
    assert client.post("/verification/submit", headers=auth(ids[0]), json=proof).status_code == 200


def test_post_reports_reach_both_content_and_user_case_queues(setup):
    client, _, ids, post_id, _ = setup
    response = client.post(f"/posts/{post_id}/report", headers=auth(ids[1]), json={"reason":"Please check misleading details in this notice."})
    assert response.status_code == 200, response.text
    assert response.json()["case_id"].startswith("USR-")
    assert client.get("/admin/reports", headers=auth(ids[2])).json()[0]["post_id"] == post_id
    assert client.get("/admin/user-reports", headers=auth(ids[2])).json()[0]["post_id"] == post_id


def test_removing_responder_closes_unfinished_exchange_without_credits(setup):
    client, engine, ids, post_id, rr_id = setup
    result = client.post(f"/admin/users/{ids[1]}/delete", headers=auth(ids[2]), json={"confirmation":"DELETE","note":"Reviewed removal of the responding member's account."})
    assert result.status_code == 200, result.text
    assert client.post(f"/requests/{rr_id}/complete", headers=auth(ids[0])).status_code == 403
    with Session(engine) as session:
        assert session.get(ResponseRequest, rr_id).status == "Rejected"
        assert session.get(User, ids[0]).credits == 0
        assert not session.exec(select(Message)).all()
