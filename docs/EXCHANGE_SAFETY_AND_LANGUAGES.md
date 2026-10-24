# Exchange, trust and moderation flows

## Neighbour exchange

1. A member publishes a notice; another member responds. A person cannot respond to their own notice.
2. The owner accepts one response. The notice becomes In Progress and private chat opens for those two members only.
3. Each person selects Confirm exchange completed after the actual exchange. One confirmation keeps chat available while waiting for the other person.
4. The second confirmation resolves the notice, awards each person 10 credits once, records an irreversible chat closure and deletes its message text. SSE notifies the other window; a state poll provides a fallback. Refreshing or calling the message API directly does not reopen the chat.
5. Inbox entries show chat closed and no longer link to an active composer. The exchange/credit record remains. Create a new notice for a new exchange.
6. Reviews target the other accepted participant. The UI requests eligibility from the server; nonparticipants and self-ratings are rejected.

Existing mutually confirmed exchanges are backfilled at startup. That cleanup does not award credits again. Report a safety concern before confirming completion if message context is needed: deleted message logs cannot be reconstructed from a case ID.

## Trust checks

- Saving a name, email, phone or area does not independently verify it.
- Publishing now requires approved community status AND a completed community/address check. This applies to all plans and staff accounts, with no role or paid-plan bypass. Unverified, pending, rejected or revoked checks return HTTP 403 before reserving posting quota. Existing notices are retained.
- Signup opens an email-code step with resend timing, accessible code entry and incorrect-code feedback. If SMTP is unavailable, onboarding explicitly says so and continues to community review without marking email verified. Email OTP alone never grants community approval or publishing permission.
- Email: request and confirm a six-digit code. Delivery needs a configured SMTP provider; the UI states when setup is unavailable. Codes expire and are single-use.
- Community: submit a society reference with that person's permission. An independent moderator reviews it; approval updates both member status and the community progress check.
- Phone: save it in Profile; after approving the reference, the moderator independently confirms it under Users → Review phone & address. No SMS verification is claimed.
- Changing a phone resets its check. Changing area resets community status and invalidates old pending/approved references.
- Staff permission is separate from identity verification. Moderators do not need community approval to use their dashboard; publishing their own notices requires independent community approval. Staff can submit a reference and cannot approve their own evidence.
- Government-ID documents, Aadhaar numbers and banking details are not requested. Reports refer to internal member and case IDs.

## Moderator and Super Admin

- Verification queue: inspect the reference, leave feedback, approve/reject.
- Users: see the current plan, account status and trust information. Review phone/community checks independently.
- Manage plan & account: choose Free, Plus or Society, a validity period and a reason. This is an audited staff grant, not a payment; it does not create a paid invoice.
- User reports: inspect USR case ID, reporter, reported member, reason, related post/conversation IDs, review status and review note. An involved staff member cannot review their own case.
- Post reports remain in the content-moderation queue as well as the member-safety case queue.
- Suspend account access: blocks sign-in and existing sessions; the other participant cannot continue the conversation. Restore requires a fresh sign-in.
- Super Admin alone can delete an eligible account after a reason and explicit DELETE confirmation. Public posts and personal profile data are removed, access disabled, and chat messages cleared. Unfinished exchanges involving the removed member close without awarding completion credits. A tombstone retains minimal exchange, billing and moderation relationships. A deleted account cannot be restored.
- Protected staff/self-account restrictions prevent accidental removal of the operator's own access. Role changes, plan grants, verification decisions and restrictions are recorded in Audit trail.

## Languages and filters

English, Gujarati and Hindi interface catalogues now include page paragraphs, forms, trust steps, chat/safety instructions, moderator controls and common feedback. User-written notices, messages, names and reviews are not translated. Select option values remain the original API identifiers. Legal policy text is explicitly labelled as published in English; technical references and product names retain their original spelling.

The noticeboard has a labelled search/area row and a separate filter/sort toolbar. On phones the search and area fields share a compact row, with sort and more filters aligned below. Only compact touch layouts get the bottom dock; toast spacing accounts for the dock in both themes.

## Payments

Checkout remains an explicitly labelled simulation. Real Razorpay/Stripe charging requires an activated merchant account, provider credentials, server-created orders and idempotent signature-verified payment confirmation. No provider credentials or merchant account were supplied for this release, so no live payment switch is enabled.

## Verification commands

From backend: `.venv/bin/python -m pytest -q`.
From frontend: `npm test`, `npm run build`, then `PYTHON_BIN=../backend/.venv/bin/python npm run test:browser` (use an absolute Python path if needed).
The focused real-browser/API flow is `PYTHON_BIN=<absolute-python-path> node tests/exchange-browser.mjs`.
Signup and publishing authorization checks: `PYTHON_BIN=<absolute-python-path> node tests/verification-browser.mjs`. Its mail capture replaces SMTP only inside the isolated test server; it does not establish delivery to real inboxes.

Tests use isolated SQLite databases and fictional members. No production member is suspended, deleted, charged or given a plan during testing.

Release verification on 24 October 2026: 80 backend tests and 11 subtests; 24 frontend unit tests; 104 browser page/viewport checks at 360, 390, 768 and 1280 pixels; 13 additional dark-theme accessibility scans and keyboard/error-recovery flows. A separate two-member browser flow verifies mutual completion clearing both chat windows, trust approvals, safety reports, staff plan grants and Gujarati/Hindi forms without translating member-written posts.

Publishing-verification follow-up: 84 backend tests plus 11 subtests, 24 frontend unit tests and the production build. The signup browser test covers a captured test-mail OTP, wrong-code rejection, four responsive/accessibility widths, pending/unverified/staff publishing denial, approved publishing, area-change revocation and the unconfigured-mail fallback. No real inbox delivery is claimed by that test.
