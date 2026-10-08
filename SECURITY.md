# Security review and deployment

Reviewed the tracked source at upstream commit `9dded148f0b4fff9602ea801e171bbaa47440490`.
This is a source review with local regression tests, not a penetration test of a deployed site.
No live URL, hosting access, database contents, secret-manager values, or repository history scan was supplied.

## Deployment steps (required)

1. Back up the existing database and uploads. Use Python 3.12+ and Node 20.9+.
2. Configure a new random `JWT_SECRET_KEY` (at least 32 bytes) on the backend. There is no fallback.
   Existing tokens will stop working. Generate with `python -c 'import secrets; print(secrets.token_urlsafe(48))'`.
3. Configure a separate `MFA_ENCRYPTION_KEY` on the backend, generated with
   `python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'`.
   Back it up securely; replacing it makes enrolled authenticators unreadable. MFA setup returns 503 until configured.
4. Set backend `APP_ENV=production`, install `backend/requirements.txt`, and start the backend.
   New MFA, revocation, rating-claim, and rate-limit tables are created without changing existing User columns.
5. Configure frontend `API_BASE_URL` to the exact HTTPS backend origin (no path), and
   `APP_ORIGIN` to the exact HTTPS website origin. The old `NEXT_PUBLIC_API_BASE` remains a fallback for existing deployments.
   Install with `npm ci`, then `npm run build` and `npm start`. Static-only hosting is insufficient: the cookie proxy needs a Next.js server.
6. Browser calls are same-origin through `/api/backend`; leave backend `CORS_ORIGINS` empty unless a separately trusted browser client is required.
7. Set the same random `PROXY_SHARED_SECRET` in both services and set frontend `TRUST_PROXY_CLIENT_IP=true`
   only if your hosting ingress overwrites `X-Forwarded-For`. Otherwise do not trust that header.
   Without trusted forwarding, requests through the proxy share its backend IP quota (240/minute, 20 auth attempts/minute).
   Per-email login attempts are also limited to 10/minute; mutations to 60/minute per bearer token/IP.
   Counters are atomic in the application database and shared by workers using that database.
8. Old `pass1234` logins are blocked. Reset affected accounts through the operator-only CLI:
   `cd backend && python manage_user.py your-email@example.com --role super_admin`.
   The password is entered through a hidden prompt. Do not run against the wrong database.
9. Enroll MFA from Settings and keep a protected backup of the setup key before confirmation.
   MFA is opt-in; enroll all administrator accounts. Codes cannot be reused and enabling MFA invalidates older sessions.
   There is no self-service recovery/disable endpoint; operator recovery requires verified identity and database access.
10. Legacy uploads are no longer routed through the frontend: users must re-upload images through the hardened endpoint.
    Remove or quarantine legacy files on the API host, since the backend static mount can still serve previously stored files.
    Keep the uploads volume persistent and apply storage quotas/retention at the host; per-request limits do not cap total disk usage.

Local development uses `npm run dev`, an HTTP localhost backend, and a configured random JWT key.
Production cookies are Secure, HttpOnly, host-only, and SameSite=Strict; production needs HTTPS.
Sessions expire after one hour and logout revokes the current token server-side.

## Checklist results

| # | Check | Result and change |
|---|---|---|
| 1 | SQL injection | SQLModel/SQLAlchemy use bound parameters; no raw interpolated query found. Literal injection probes covered by tests. |
| 2 | XSS | No raw HTML rendering/eval sink found in tracked UI. React escapes user text. Uploads are decoded and re-encoded; security headers added. CSP still permits inline scripts/styles for Next hydration; nonce CSP is future hardening. |
| 3 | CSRF | Cookie-authenticated frontend writes require exact Origin plus a custom CSRF header, including login/logout. Backend accepts bearer headers, not cookies. |
| 4 | Uploads | Authentication, streamed body cap (6 MiB), file cap (5 MiB), content decoding, 16 MP cap, PNG re-encoding, generated names, and per-user image attachment checks. Old uploads need quarantine. |
| 5 | IDOR / object authorization | Post owner/admin rules retained and tested. Removed admin bypass for private conversations. Verification records are owner/admin-scoped; self-verification review blocked. |
| 6 | Rate limits | Persistent, atomic IP/auth-account/write counters; Retry-After on 429. Configure trusted proxy IP forwarding as above; enforce edge limits too for volumetric attacks. |
| 7 | JWT secrets | Removed predictable key. Required environment secret, explicit HS256, issuer/audience/required claims, one-hour expiry, malformed-sub rejection, token revocation. |
| 8 | Exposed secrets | Hardcoded signing key removed; no other service credential found in tracked source. Server-only proxy configuration. Rotate any previously deployed secret; historical exposure cannot be undone by this commit. |
| 9 | Password hashes | Argon2id for new passwords; legacy bcrypt migrates on login. Removed silent 72-byte truncation. Signup requires 12–128 characters. |
| 10 | MFA | Authenticator enrollment and login codes added; password reauthentication, encrypted secrets, replay prevention, enrollment expiry, and session invalidation. Opt-in, not mandatory for all accounts. |
| 11 | CORS | Removed wildcard hosting-domain regex and credentialed CORS; exact configured origins only. Production localhost not automatically trusted. |
| 12 | Local-storage tokens | Removed token storage and reads. Proxy sets HttpOnly cookie and strips bearer tokens from browser responses. Old local storage entry removed on startup. |
| 13 | Client-only permissions | Backend dependencies enforce roles and object ownership independently of UI. Regression tests include unauthorized role changes and private-message access. |
| 14 | Row-level security | Default SQLite has no native RLS. Application-level authorization is the enforcement layer. A hosted Postgres/Supabase policy cannot be checked without that deployment/schema. Do not expose database credentials or direct DB access to clients. |
| 15 | Webhook signatures | No webhook receiver exists in tracked application; not applicable. Verify signatures before adding one. |
| 16 | SSRF | No user-driven outbound backend fetch found. New proxy destination is server-configured; path validation and redirect rejection prevent client-selected destinations. |
| 17 | Source maps | Production browser source maps explicitly disabled. Build output checked; server-side maps remain server-only and must not be published. |
| 18 | Default credentials | Removed startup/manual web seeding; development seed requires explicit opt-in and a supplied password and never resets existing accounts. Known demo-password login blocked; CLI available for account reset/bootstrap. |
| 19 | Sensitive logs | Removed seed password/identity logging and web traceback endpoint. Validation errors omit raw inputs. Hosting/request logs and historical logs were not accessible. |
| 20 | Dependencies | Next/React and backend packages updated; lockfile refreshed and automated audits added. See validation below. |

Other fixes: duplicate administrator reporting routes removed; repeat-rating credit inflation blocked with an atomic rating claim.

## Validation

Validated locally: 35 backend tests plus 11 unittest subtests, 13 frontend proxy tests, production build,
no production browser `.map` files, zero known advisories from `npm audit` and `pip-audit`.

Run backend tests with `cd backend && python -m pytest -q` (conftest generates test-only secrets).
Run frontend proxy tests with `cd frontend && npm test` and production build with `npm run build`.
Run `pip-audit -r backend/requirements.txt` and `npm audit` regularly; advisory data changes.
CI and Dependabot configuration are committed with the changes.

## Remaining operational limits

No secret rotation, production account reset, deployment configuration, historical cleanup, or live-site scan has been performed.
SQLite RLS, MFA enrollment for existing users, encrypted backups/storage, ingress TLS and header sanitization,
and private hosting logs require operator action. Fixed-window limits can allow a burst across a window boundary.
This review does not establish that the site is free of vulnerabilities.

Dependency advisory references used in selecting upgrades:
- https://nextjs.org/blog
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/advisories/GHSA-rj75-hqrm-r3gf

## Administrator provisioning on restricted hosting

An operator can configure `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_NAME`, and
`ADMIN_BOOTSTRAP_PASSWORD_HASH` in the backend secret manager. The hash must be strong
Argon2id. Startup creates a super administrator only when that email is absent; it never
promotes or resets an existing account and exposes no public provisioning endpoint.
Remove the provisioning variables after setup on a persistent database. Keep the initial
password private and replace it through Settings; password changes invalidate all older
sessions, require the current password and an authenticator code when MFA is enabled.

Render free services with the default SQLite configuration have ephemeral storage. Service
restarts/redeploys can erase accounts, posts, MFA enrollments and uploads. Provisioning
variables can recreate the operator account but are not a substitute for a persistent database
and upload volume. A storage upgrade requires an operator decision before production use.

## Interface

The frontend uses Lumen React 4.0 and semantic theme tokens, with responsive navigation and
Light, Dark and System modes. Only the appearance preference is saved in local storage;
authentication remains in HttpOnly cookies. Node 22.12+ is required (hosting uses Node 24).
