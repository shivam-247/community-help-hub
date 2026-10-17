# Portfolio release — 17 October 2026

## Audit and resulting behaviour

The existing app was retained. The audit found unbounded feed/history queries, client-side filtering after retrieval, inconsistent error recovery, repeated password controls, and plan allowances that did not match the requested paid offering. The installed Next.js 16 / React 19 stack was preserved.

| Module | Change |
| --- | --- |
| Plans and billing | Free: five posts/calendar month; Plus/Society: unlimited posts, with fair-use rate limits. Server-side subscription expiry, usage ledger, invoices and priority ordering. Mock checkout is explicitly labelled. |
| Trust | Paid membership badges are visually distinct from independent verification and earned credit tiers. Buying a plan never grants trust permissions. |
| Database | Additive models/indexes, SQLite WAL and busy timeout, failed transaction rollback; no destructive migration. |
| Feeds | SQL filters and visibility checks run before bounded pagination. Public and private feeds use an envelope with items, page, page_size, total and has_more. |
| Other lists | Inbox, notifications, admin queues, profiles and invoices have bounded queries and UI paging. Message history uses a before_id cursor with chronological windows. Legacy embedded profile/history snapshots are capped. Society membership selection remains capped at 50. |
| Errors | Common ASGI middleware catches unexpected route failures, returns safe 500/503/409 responses and correlation IDs. Expected permission/validation failures retain meaningful HTTP codes. A streaming response already started cannot be replaced by a second response. |
| Logging | JSON application logs include route templates, request IDs, status and duration. They omit bodies, secrets, raw query strings, IPs, exception text and SQL values. Raw Uvicorn access logging is disabled. |
| Authentication | Existing Argon2id hashing and legacy bcrypt migration retained; JWT/MFA secrets come from environment variables. HttpOnly session cookie, CSRF/origin controls, server-side permissions and production HTTPS configuration retained. |
| Input and uploads | Shared server-side text normalization, control-character/HTML removal, bounded fields; passwords/tokens retain their exact value. Images are decoded, resized and re-encoded to remove metadata, with processed size limits and safe storage errors. |
| UI | Deep green tokens, shared header/footer and light/dark modes retained. Accessible password visibility controls, disabled submissions, loading/empty/error/retry states, route/global error boundaries, paged cards and responsive layouts. |
| Content | About/mission, contact, pricing, privacy, terms, cookies, refunds, accessibility and references available through consistent navigation. Claims distinguish a college demo from a live commercial service. |

## Verification and run instructions

See README.md for environment variables, local backend/frontend setup and exact test commands. Backend regressions cover quotas, spam, permissions, validation, safe failures and pagination. Frontend unit tests cover the proxy, pagination metadata, malformed responses and contrast tokens. The isolated Playwright runner exercises signup/login, test checkout, posting, reviewed-account private chat/history, feed paging and password visibility; it checks 26 routes at four viewport widths. CI runs backend/frontend checks, the isolated browser suite and dependency audits.

Manual acceptance checklist: keyboard-only signup and navigation; visible focus in both themes; mobile filter sheet; upload rejection/retry; expired session recovery; cross-user object access rejection; free quota and expired paid plan; inbox acceptance/completion; notification read/unread; moderation and verification; contact/policy links; deployment health and request-ID logs.

## Verified results

- Backend: 61 tests and 11 subtests passed (one upstream Starlette/httpx deprecation warning).
- Frontend: 19 unit tests passed; optimized Next.js build passed.
- Browser: all 104 viewport/route checks passed, plus signup/login, mock checkout, posting, reviewed-account chat/history, feed pagination and password visibility. No unexpected browser console/page errors were observed. The browser fixture uses isolated development servers; production HTTPS enforcement is retained.
- Dependency audits: pip-audit and npm audit reported no known vulnerabilities on 17 October 2026.

## Remaining deployment and submission limits

- Render free storage is ephemeral. Durable database and private image storage, backups and restore tests are required before real member onboarding.
- Checkout is simulated, not a payment processor. BillingGateway separates provider logic; live payments require signature-verified, idempotent webhooks and independently verified invoices. Do not activate plans from browser redirects.
- SMTP must be configured and delivery tested; a queued message is not proof of delivery.
- The actual academic paper and its cited bibliography were unavailable. The References page labels official implementation sources; it does not invent research citations or claim to reproduce the paper's bibliography.
- Policies and accessibility work do not certify legal compliance or WCAG conformance. Automated checks cannot guarantee every possible user action or external failure.
- Pagination is offset-based for ordinary feeds; very large datasets should migrate to indexed cursor pagination and durable database migrations.

## Changed files

- `.github/workflows/security.yml`
- `.gitignore`
- `PORTFOLIO_RELEASE.md`
- `README.md`
- `backend/app/billing_gateway.py`
- `backend/app/database.py`
- `backend/app/demo.py`
- `backend/app/feed.py`
- `backend/app/input_validation.py`
- `backend/app/main.py`
- `backend/app/ml.py`
- `backend/app/models.py`
- `backend/app/observability.py`
- `backend/app/pagination.py`
- `backend/app/post_operations.py`
- `backend/app/product.py`
- `backend/app/product_models.py`
- `backend/app/routers/admin_router.py`
- `backend/app/routers/messages_router.py`
- `backend/app/routers/posts_router.py`
- `backend/app/routers/product_router.py`
- `backend/app/routers/reports_router.py`
- `backend/app/routers/responses_router.py`
- `backend/app/routers/users_router.py`
- `backend/app/routers/verification_router.py`
- `backend/app/schemas.py`
- `backend/app/settings.py`
- `backend/test_product.py`
- `backend/test_release.py`
- `frontend/AGENTS.md`
- `frontend/app/about/page.js`
- `frontend/app/admin/page.js`
- `frontend/app/admin/verifications/page.js`
- `frontend/app/contact/page.js`
- `frontend/app/create-post/page.js`
- `frontend/app/error.js`
- `frontend/app/global-error.js`
- `frontend/app/globals.css`
- `frontend/app/inbox/page.js`
- `frontend/app/layout.js`
- `frontend/app/loading.js`
- `frontend/app/messages/[id]/page.js`
- `frontend/app/noticeboard/page.js`
- `frontend/app/notifications/page.js`
- `frontend/app/page.js`
- `frontend/app/pricing/page.js`
- `frontend/app/profile/[id]/page.js`
- `frontend/app/references/page.js`
- `frontend/components/AccountPanels.js`
- `frontend/components/AuthForm.js`
- `frontend/components/InvoiceList.js`
- `frontend/components/MFASettings.js`
- `frontend/components/MemberBadge.js`
- `frontend/components/Nav.js`
- `frontend/components/Pagination.js`
- `frontend/components/PasswordInput.js`
- `frontend/components/PasswordSettings.js`
- `frontend/components/PostCard.js`
- `frontend/components/RecoveryPanel.js`
- `frontend/components/RouteGuard.js`
- `frontend/lib/api.js`
- `frontend/lib/auth-context.js`
- `frontend/lib/proxy.mjs`
- `frontend/lib/references.js`
- `frontend/lib/use-paged-resource.js`
- `frontend/lib/use-require-auth.js`
- `frontend/next.config.js`
- `frontend/package-lock.json`
- `frontend/package.json`
- `frontend/tests/api.test.mjs`
- `frontend/tests/browser-checks.mjs`
- `frontend/tests/proxy.test.mjs`
