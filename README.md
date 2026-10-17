# Community Help Hub

An individual college project by Shivam Parmar: a neighbourhood noticeboard for free help, giveaways and skills in Indian societies. Payments are simulated; no money changes hands. It is a portfolio/demo deployment, not a certified production service.

## Stack

- Frontend: Next.js 16.4, React 19.3, Tailwind CSS 4, Radix/shadcn-style components, Lucide, react-hook-form and Zod.
- Backend: Python, FastAPI, SQLModel, SQLite, Argon2id/JWT and encrypted TOTP MFA. Tests/CI use Python 3.12; the repository is not downgraded to an older frontend stack.
- Deployment: Vercel frontend and Render API. Same-origin Next.js proxy keeps tokens in an HttpOnly cookie and protects writes with origin/CSRF checks.

## Features

Paginated public/private society noticeboards; locality, category and keyword filters; labelled priority listings; controlled photo uploads; moderation/spam checks; accepted-exchange private SSE chat with message history; in-app notifications and optional SMTP alerts; two-person completion credits; separate trust checks; profiles/account security; Free, Plus and Society test plans; admin moderation; policy/contact/about/reference pages.

Free allows five posts per calendar month. Plus and Society have unlimited posting and active notices, subject to fair-use rate limits and moderation. Paid membership badges never grant identity verification. All plans currently have no ads.

## Local setup

Use separate terminals for the backend and frontend. Do not commit `.env` files or real member data.

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
export JWT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export MFA_ENCRYPTION_KEY="$(python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())')"
export APP_ENV=development
export DEMO_SEED_ENABLED=true
export MOCK_CHECKOUT_ENABLED=true
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The opt-in seeder creates labelled fictional notices, never demo login credentials or fake reviews. To administer a local account, register normally and use the authenticated operator CLI `python manage_user.py your-email@example.com --role super_admin`; this is not a public HTTP provisioning route.

Frontend:

```bash
cd frontend
npm ci
# In frontend/.env.local, set:
# API_BASE_URL=http://localhost:8000
# APP_ORIGIN=http://localhost:3000
npm run dev
```

Open `http://localhost:3000`. SMTP alerts require provider configuration and verified, opted-in recipients; a queued email is not proof of delivery.

## Verification

```bash
cd backend
python -m pytest -q
cd ../frontend
npm test
npm run build
npm audit
npx playwright install chromium
# Use an absolute Python path with backend dependencies installed:
PYTHON_BIN=/absolute/path/to/backend/.venv/bin/python npm run test:browser
```

The browser runner starts isolated local servers on ports 3100/8100, creates random test credentials and a temporary database, and tears the servers down. It checks real signup, login, mock checkout, posting, reviewed-account chat, history and feed paging, then every page at 360/768/1024/1440px. It never connects to the deployed database.

## Deployment and operational limits

Set strong environment secrets, an exact HTTPS `APP_ORIGIN`, exact CORS origins if required, `PROXY_SHARED_SECRET` on both services and the HTTPS `API_BASE_URL` on Vercel. Render terminates TLS; Vercel serves HTTPS; production responses use HSTS and CSP upgrades. Avoid adding application redirects that loop behind TLS termination. `/health` is available for service checks.

SQLite uses WAL/busy timeout and additive indexes; requests roll back failed transactions. Free Render storage remains ephemeral. Use durable database/image storage and tested backups before collecting real member data. No storage upgrade or paid infrastructure is silently provisioned.

API failures have safe JSON messages and request IDs. Structured application logs omit bodies, tokens, IPs, query values, SQL parameters and exception messages. Third-party mail requires its own operational/unsubscribe review. Policies are project-specific drafts and do not certify legal or accessibility compliance.

See `PORTFOLIO_RELEASE.md` for the module audit and contracts, `SECURITY.md` for security controls, `LEGAL_AND_PRIVACY_REVIEW.md` for remaining privacy/legal work and `THIRD_PARTY_NOTICES.md` for asset licences. The actual research-paper bibliography was not supplied; `/references` clearly labels its verified implementation sources instead of inventing paper citations.
