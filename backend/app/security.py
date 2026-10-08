"""Request bounds, persistent rate limiting, and API response hardening."""
import hashlib
import hmac
import ipaddress
import json
import os
import time
from sqlalchemy import delete, update
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session
from starlette.responses import JSONResponse
from .database import engine
from .models import RateLimitBucket, RevokedToken
from .settings import MAX_BODY_BYTES


def consume_bucket(key, limit, now=None):
    now = int(time.time()) if now is None else now
    window = now // 60
    bucket_key = hashlib.sha256(f"{window}:{key}".encode()).hexdigest()
    with Session(engine) as session:
        # INSERT may race, but the conditional UPDATE is atomic across workers.
        if not session.get(RateLimitBucket, bucket_key):
            session.add(RateLimitBucket(key=bucket_key, count=0, expires_at=(window + 1) * 60))
            try:
                session.commit()
            except IntegrityError:
                session.rollback()
        result = session.exec(update(RateLimitBucket).where(RateLimitBucket.key == bucket_key,
            RateLimitBucket.count < limit).values(count=RateLimitBucket.count + 1))
        session.exec(delete(RateLimitBucket).where(RateLimitBucket.expires_at < now - 60))
        session.exec(delete(RevokedToken).where(RevokedToken.expires_at < now))
        session.commit()
        return result.rowcount == 1


class SecurityMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        async def secured_send(message):
            if message["type"] == "http.response.start":
                message["headers"] += [(b"x-content-type-options", b"nosniff"),
                    (b"referrer-policy", b"no-referrer"), (b"cache-control", b"no-store")]
                if scope["path"].startswith("/uploads/"):
                    message["headers"].append((b"content-security-policy", b"default-src 'none'; sandbox"))
            await send(message)
        async def reject(code, detail):
            response = JSONResponse({"detail": detail}, status_code=code,
                headers={"Retry-After": "60"} if code == 429 else None)
            await response(scope, receive, secured_send)
        try:
            if int(headers.get(b"content-length", b"0")) > MAX_BODY_BYTES:
                return await reject(413, "Request too large.")
        except ValueError:
            return await reject(400, "Invalid Content-Length.")
        body = bytearray()
        if scope["method"] not in ("GET", "HEAD", "OPTIONS"):
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                body.extend(message.get("body", b""))
                if len(body) > MAX_BODY_BYTES:
                    return await reject(413, "Request too large.")
                if not message.get("more_body"):
                    break
        ip = scope.get("client", ("unknown", 0))[0]
        proxy_secret = os.environ.get("PROXY_SHARED_SECRET", "")
        if proxy_secret and hmac.compare_digest(headers.get(b"x-chh-proxy-secret", b"").decode(), proxy_secret):
            try:
                ip = str(ipaddress.ip_address(headers.get(b"x-chh-client-ip", b"").decode()))
            except ValueError:
                pass
        # Run blocking DB work off the event loop.
        from starlette.concurrency import run_in_threadpool
        if scope["method"] != "OPTIONS":
            if not await run_in_threadpool(consume_bucket, f"ip:{ip}", 240):
                return await reject(429, "Too many requests. Try again in a minute.")
            if scope["method"] in ("POST", "PATCH", "DELETE", "PUT"):
                authorization = headers.get(b"authorization", b"")
                identity = hashlib.sha256(authorization).hexdigest() if authorization else ip
                if not await run_in_threadpool(consume_bucket, f"writes:{identity}", 60):
                    return await reject(429, "Too many changes. Try again in a minute.")
            if scope["path"] in ("/auth/login", "/auth/signup", "/auth/mfa/setup", "/auth/mfa/confirm"):
                if not await run_in_threadpool(consume_bucket, f"auth-ip:{ip}", 20):
                    return await reject(429, "Too many authentication attempts.")
                try:
                    email = json.loads(body).get("email", "").strip().lower()
                except (ValueError, AttributeError):
                    email = ""
                if email and not await run_in_threadpool(consume_bucket, f"auth-account:{email}", 10):
                    return await reject(429, "Too many authentication attempts.")
        delivered = False
        async def replay():
            nonlocal delivered
            if not delivered and scope["method"] not in ("GET", "HEAD", "OPTIONS"):
                delivered = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()
        await self.app(scope, replay, secured_send)
