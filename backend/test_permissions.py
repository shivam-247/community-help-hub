"""Permission and referential-integrity regression tests using an isolated database.

Run: python -m unittest test_permissions -v
"""
import unittest
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlmodel import SQLModel, Session, create_engine, select
from sqlalchemy.pool import StaticPool
from app.database import get_session
from app.auth import get_current_user
from app.models import (User, Locality, Post, PostType, Role, ResponseRequest,
    Message, Rating, Report)
from app.routers import posts_router, admin_router


class PostPermissionsTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        loc = Locality(name="Test locality")
        self.session.add(loc)
        self.session.flush()
        self.owner = User(name="Owner", email="owner@test.com", hashed_password="unused", locality_id=loc.id)
        self.other = User(name="Other", email="other@test.com", hashed_password="unused", locality_id=loc.id)
        self.admin = User(name="Admin", email="admin@test.com", hashed_password="unused", role=Role.admin, locality_id=loc.id)
        self.session.add_all([self.owner, self.other, self.admin])
        self.session.flush()
        self.post = Post(owner_id=self.owner.id, locality_id=loc.id, type=PostType.need_help,
            title="Please help with groceries", description="I need a neighbor to help carry groceries home this weekend.")
        self.session.add(self.post)
        self.session.flush()
        self.report = Report(post_id=self.post.id, reporter_id=self.other.id, reason="Needs review")
        self.session.add(self.report)
        self.session.commit()
        self.current = self.owner
        app = FastAPI()
        app.include_router(posts_router.router)
        app.include_router(admin_router.router)
        app.dependency_overrides[get_session] = lambda: self.session
        app.dependency_overrides[get_current_user] = lambda: self.current
        self.client = TestClient(app)
        self.app = app

    def tearDown(self):
        self.client.close()
        self.session.close()
        self.engine.dispose()

    def test_non_owner_cannot_edit_delete_or_change_status(self):
        self.current = self.other
        for method, path, body in [
            ("PATCH", f"/posts/{self.post.id}", {"title": "Changed title"}),
            ("PATCH", f"/posts/{self.post.id}/status", {"status": "Resolved"}),
            ("DELETE", f"/posts/{self.post.id}", None),
        ]:
            with self.subTest(method=method, path=path):
                self.assertEqual(self.client.request(method, path, json=body).status_code, 403)

    def test_anonymous_requests_are_rejected(self):
        del self.app.dependency_overrides[get_current_user]
        for method, path, body in [
            ("PATCH", f"/posts/{self.post.id}", {"title": "Changed title"}),
            ("DELETE", f"/posts/{self.post.id}", None),
            ("GET", "/admin/reports", None),
        ]:
            with self.subTest(path=path):
                self.assertEqual(self.client.request(method, path, json=body).status_code, 401)

    def test_owner_edits_and_clears_deadline(self):
        with patch.object(posts_router.ml_engine, "validate_post_quality", return_value=(True, "")):
            response = self.client.patch(f"/posts/{self.post.id}", json={"title": "Help carrying grocery bags", "deadline": "2026-10-10T10:00:00+05:30"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["title"], "Help carrying grocery bags")
        response = self.client.patch(f"/posts/{self.post.id}", json={"deadline": None})
        self.assertIsNone(response.json()["deadline"])

    def test_admin_can_change_status_but_not_content(self):
        self.current = self.admin
        self.assertEqual(self.client.patch(f"/posts/{self.post.id}", json={"status": "Resolved"}).status_code, 200)
        self.assertEqual(self.client.patch(f"/posts/{self.post.id}", json={"description": "Changed"}).status_code, 403)

    def test_validation_rejects_null_and_extra_fields(self):
        for body in [{"title": None}, {"priority": None}, {"status": "invalid"}, {"owner_id": self.other.id}, {"title": ""}]:
            with self.subTest(body=body):
                self.assertEqual(self.client.patch(f"/posts/{self.post.id}", json=body).status_code, 422)

    def test_reports_require_admin_and_validate_status(self):
        self.assertEqual(self.client.get("/admin/reports").status_code, 403)
        self.assertEqual(self.client.patch(f"/admin/reports/{self.report.id}", json={"status": "Reviewed"}).status_code, 403)
        self.current = self.admin
        response = self.client.get("/admin/reports")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()[0]["reporter_name"], "Other")
        for status in ["Reviewed", "Actioned"]:
            response = self.client.patch(f"/admin/reports/{self.report.id}", json={"status": status})
            self.assertEqual(response.json()["status"], status)
        self.assertEqual(self.client.patch(f"/admin/reports/{self.report.id}", json={"status": "bad"}).status_code, 422)
        self.assertEqual(self.client.patch("/admin/reports/999", json={"status": "Reviewed"}).status_code, 404)

    def test_deletion_removes_dependents_and_updates_rating(self):
        request = ResponseRequest(post_id=self.post.id, requester_id=self.other.id, message="Can help")
        self.session.add(request)
        self.session.flush()
        self.session.add(Message(response_request_id=request.id, sender_id=self.other.id, text="Hello"))
        self.session.add(Rating(post_id=self.post.id, rater_id=self.other.id, rated_user_id=self.owner.id, stars=5))
        self.owner.rating_count, self.owner.rating_avg = 1, 5
        self.session.add(self.owner)
        self.session.commit()
        post_id = self.post.id
        response = self.client.delete(f"/posts/{post_id}")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {"ok": True, "deleted_post_id": post_id})
        for model in [Post, ResponseRequest, Message, Rating, Report]:
            self.assertEqual(list(self.session.exec(select(model)).all()), [])
        self.session.refresh(self.owner)
        self.assertEqual(self.owner.rating_count, 0)
        self.assertEqual(self.owner.rating_avg, 0)

    def test_admin_delete_uses_same_cleanup(self):
        self.current = self.admin
        response = self.client.delete(f"/admin/posts/{self.post.id}")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(list(self.session.exec(select(Report)).all()), [])


if __name__ == "__main__":
    unittest.main()
