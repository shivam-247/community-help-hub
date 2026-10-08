# Community Help Hub product upgrade

## Audit and design

The old account screen mixed security, privacy, avatars and identity review into a long list. Purple avatar artwork and emoji badges distracted from the green brand. Mobile category controls lacked a fade and filter panel. Billing had no entitlements, messages polled, notifications were not stored, and the post validator rejected Indian scripts.

The upgrade keeps the existing app, authentication and noticeboard. Radix-backed shadcn-style Card, Tabs, Badge, Progress and Sheet components use semantic CSS variables. Deep green, warm neutral surfaces, Noto Serif headings and Noto Sans body text replace decorative gradients. Hindi and Gujarati use bundled font fallbacks. Light/dark/system mode, keyboard focus, reduced motion and 44px controls are retained.

## Pages and changed files

- Landing: `frontend/app/page.js`, `app/layout.js`, `app/about/page.js`.
- Noticeboard: `frontend/app/noticeboard/page.js`, `components/PostCard.js`, `components/Skeleton.js` (existing skeletons reused).
- Account: `frontend/app/settings/page.js`, `components/AccountPanels.js`, `components/Avatars.js`, `components/BadgeTier.js`. Existing password and authenticator components are retained.
- Forms: `frontend/components/AuthForm.js`, `app/login/page.js`, `app/signup/page.js`, `app/create-post/page.js` use React Hook Form and Zod.
- Plans: `frontend/app/pricing/page.js`; billing includes usage, immediate Free downgrade, test invoices and society boards.
- Messaging and updates: `frontend/app/messages/[id]/page.js`, `app/notifications/page.js`, `components/Nav.js`, `lib/proxy.mjs`, `app/api/backend/[...path]/route.js`, `components/RouteGuard.js`.
- Moderation: `frontend/app/admin/page.js`, `components/TrustReview.js`. Existing reports and evidence queues are retained; spam approval and separate phone/address review are added.
- Shared UI: `frontend/components/ui/index.js`, `components/Icons.js`, `app/globals.css`, `package.json`, `package-lock.json`.
- Backend: `backend/app/product_models.py`, `product.py`, `routers/product_router.py`, `demo.py`, `main.py`, `models.py`, `schemas.py`, `ml.py`, `post_operations.py`, and the posts, messages, responses, ratings, users and verification routers.
- Tests: `backend/test_product.py`, `backend/test_security.py`, `frontend/tests/proxy.test.mjs`.

## Product contracts

Free: 5 posts/calendar month. Plus: 30, priority listing, verified-member filter and email alerts. Society: 100, plus a private board, invites and member/post/completion analytics. Prices: ₹99/₹950 for Plus monthly/yearly; ₹299/₹2,870 for Society. Annual saving is approximately 20%.

Only the server sets prices. Mock checkout is enabled only with `MOCK_CHECKOUT_ENABLED=true`. There are no actual card details, Razorpay charges, recurring payments or tax invoices. Paid entitlements expire after 30/365 days and then become Free. Switching to Free is immediate. Checkout retries reuse a unique user-scoped key; deleted posts and plan changes do not reset calendar-month usage.

Chat uses authenticated server-sent events through the same-origin cookie proxy. Only accepted exchange participants can access it; access and token validity are checked during each stream. Events resume after reconnect. Messages are transported over HTTPS in deployment; this is not end-to-end encryption.

Each participant confirms completion; both receive 10 points once. Ratings do not award points. Badge tiers: Newcomer 0, Helper 5, Trusted 50, Champion 100. Credits remain earned if a post is deleted.

Notifications are private, stored in-app and respect preferences. Email alerts require a paid plan, opt-in, a verified email and a configured provider. Verification codes use a hashed, expiring, attempt-limited challenge; delivery uses the outbox. Email confirmation does not automatically confirm phone or address. An independent administrator must review submitted evidence before confirming those steps. No SMS provider is connected.

Society posts are excluded from public feeds, public profiles and public reviews. Board membership is required to read or respond. Owning a society does not grant global administrator permissions.

Opt-in sample posts are labelled Sample and reject responses. Sample members have unknown random passwords, not default credentials. Disable `DEMO_SEED_ENABLED` to stop new sample seeding; administrators can remove sample posts individually.

## Run locally

Backend (Python 3.12+):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export JWT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export MFA_ENCRYPTION_KEY="$(python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())')"
export MOCK_CHECKOUT_ENABLED=true
export DEMO_SEED_ENABLED=true
uvicorn app.main:app --reload --port 8000
```

Frontend (Node 22.12+):

```bash
cd frontend
npm ci
npm run dev
```

The frontend defaults to the local backend during development. Keep production `API_BASE_URL`, `APP_ORIGIN` and matching `PROXY_SHARED_SECRET` in server-only environment variables. Existing production secrets and super-admin bootstrap configuration remain in place.

Tests:

```bash
cd backend
pip install pytest httpx pytest-subtests
python -m pytest -q
cd ../frontend
npm test
npm run build
npm audit --omit=dev
```

## Email provider and durable hosting

Set server-only `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_FROM`, `SMTP_USER`, `SMTP_PASSWORD` and `APP_ORIGIN`. SMTP uses STARTTLS. The outbox worker attempts queued messages up to five times; provider failures leave a queued/failed record. No real email delivery is claimed without a configured provider. Run a single worker until an external queue/lease is introduced; this SQLite deployment is not designed for horizontal scale.

The current free Render service uses an ephemeral filesystem. Its SQLite database and uploads can disappear on restart/redeploy. For real member data, provision durable database storage and persistent/object storage before a production launch. Admin bootstrap can recreate the administrator, but it cannot restore residents, posts, invoices, chat or uploaded photos. No paid infrastructure was purchased during this upgrade.

## Test checklist

Automated: Free quota, deleted-post usage, disabled/duplicate/server-priced checkout, downgrade, private board access, owner-only analytics, two-person/idempotent credits, private notifications, authenticated chat event delivery, email queue/single-use verification, owned photo paths, multilingual validation, spam moderation and existing authentication/security regressions.

Manual release checks:

- At 360, 768, 1024 and 1440px: no page overflow; category chips scroll within their row; Sheet opens, traps focus and closes with Escape.
- Light and dark: read all labels, keyboard focus, alerts and disabled controls; check WCAG AA contrast with a browser audit.
- Upload a valid photo, reject an oversized/non-image file, switch back to initials.
- Sign in as two real test members, accept one exchange, receive chat events, reconnect, and confirm from both accounts. Verify each gets exactly 10 credits.
- Submit a society reference; approve it as an independent admin; confirm phone/address only after checking evidence. Verify separate progress states.
- Test Plus and Society checkout, check INR invoices, downgrade, and confirm monthly usage is preserved.
- Create a society, join with another account, publish a private notice and confirm an outsider cannot see it on any public route.
- Configure a test SMTP provider, confirm an email code and deliver an opt-in email alert. Do not mark provider delivery as tested merely because a message was queued.
- Inspect browser console and network errors across all routes. Mobile viewport and assistive technology checks must be completed before declaring the release fully accessibility-verified.
