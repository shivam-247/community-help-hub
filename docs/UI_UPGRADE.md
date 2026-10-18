# UI upgrade — 18 October 2026

> The visual direction in this report is superseded by [BRIGHT_UI_REDESIGN.md](BRIGHT_UI_REDESIGN.md), dated 18 October 2026. The functional audit fixes remain in place.

This implements the audit-first frontend brief in the existing app. No FastAPI routes, database models, authentication rules or API request/response contracts changed. The installed Next.js 16 / React 19 stack is retained rather than silently downgraded to the older versions mentioned in the brief.

## Design and shared components

Deep green primary, warm neutral solid surfaces, distinct semantic warning/danger/success colours, and self-hosted Noto Sans with Gujarati/Devanagari fallbacks. Tokens live in `frontend/app/globals.css` and `frontend/tailwind.config.js`. Text/control contrast is covered by the existing AA unit checks. UI transitions are 150ms and CSS/JS respect reduced motion.

- `AppShell`, `BottomNav`: consistent header, content, footer and phone navigation.
- `ui/index.js`: Button variants/loading, Card/Badge/Progress, accessible Tabs and focus-managed Sheet; selected Lucide imports replace the full registry.
- `Fields` and `FormFeedback`: label/hint/error slots, Input/Textarea/Select support.
- `EmptyState`, existing `Skeleton`, `RecoveryPanel`, `ToastProvider`: shared loading/recovery feedback.
- `Avatars`, `PostImage`: meaningful accessible names, initials/photo fallback, reserved image dimensions. Images use `next/image` with `unoptimized` deliberately: protected attachments need browser cookies on the existing proxy URL.
- `lib/i18n.js` and `lib/messages/{en,gu,hi}.json`: header language choice and core navigation, button, form, category/status labels. Language preference uses a functional cookie. Long explanatory/legal copy is still English; user content is not translated. Remaining English regions and translated text have language attributes.

## Page changes

| Route/view                                                         | Changes and reason                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                                                               | Clear neighbourhood-help headline, calmer surfaces and independent feed/count loading so a slow count cannot hold back valid notices.                                                                                                                                                                                        |
| Noticeboard                                                        | Sticky phone chips/filters, explicit Refresh, shareable filter URL, urgency/type/category icons, readable author metadata, report/hide menu and restore action.                                                                                                                                                              |
| Create post                                                        | Blur/submit validation, sections, public-landmark hint, character count, immediate photo validation, and focus-managed preview before publishing. Landmark text is appended to the existing description; no new API field is sent. Optional phone is managed through the existing profile flow to avoid collecting it twice. |
| Login / signup                                                     | Single-column forms, password toggle, loading/disabled controls, blur validation and safer displayed signup errors. Backend signup responses have not changed.                                                                                                                                                               |
| Inbox                                                              | My requests / My responses, selected-state semantics, direct entry by tab URL, honest page-count wording and correct noticeboard destination.                                                                                                                                                                                |
| Post detail                                                        | In-place retry, real report submission, verification requirement before responding, retained inline response errors, auth return URL, image fallback, and removal of credit-tier-as-identity wording.                                                                                                                        |
| Chat                                                               | Focusable named history, live announcements, stable status/back controls, reduced-motion scrolling within the history only, preserving a reader's older-message position. Safety menu links to a clearly labelled email report draft.                                                                                        |
| Profile                                                            | Retry for a failed profile fetch, page-scoped counts, selected-state semantics and shorter progress transition.                                                                                                                                                                                                              |
| Account Profile                                                    | Phone keypad/+91 hint, blur validation, clearer photo controls and accessible avatar semantics.                                                                                                                                                                                                                              |
| Account Security                                                   | Authenticator-load retry; password/MFA functions preserved.                                                                                                                                                                                                                                                                  |
| Account Trust                                                      | Clean loading/error boundary instead of pretending checks are incomplete when a fetch failed. Honest email-provider setup status preserved.                                                                                                                                                                                  |
| Account Notifications                                              | Error no longer leaves an endless loading message; save clears stale errors.                                                                                                                                                                                                                                                 |
| Account Billing                                                    | Existing test receipts/usage preserved, invoice UI loaded on demand, society loading/empty copy added.                                                                                                                                                                                                                       |
| Admin                                                              | Initial loading state, honest page-scoped queues, spam score limitations explained; no fabricated filter reasons. Trust review requires explicit acknowledgement that both flags are replaced by the existing API.                                                                                                           |
| Admin verification queue                                           | Failed requests no longer show a false “All caught up” result.                                                                                                                                                                                                                                                               |
| Pricing                                                            | Monthly/yearly uses pressed buttons, avoiding absent tab panels; comparison region is keyboard-scrollable. Test checkout remains explicitly free of real charges.                                                                                                                                                            |
| About, Contact, References, Privacy, Terms, Refunds, Accessibility | Existing factual content retained and shared typography/surfaces applied. Paper bibliography remains explicitly unavailable.                                                                                                                                                                                                 |
| Cookies                                                            | Functional language preference and per-tab hidden-notice storage documented.                                                                                                                                                                                                                                                 |
| 404 / global errors                                                | Existing recovery preserved; feed-labelled links now lead to the noticeboard.                                                                                                                                                                                                                                                |

## Safety scope

Report sends a real authenticated request to the existing post-report API and appears in the moderator queue. Hide affects the current browser tab/session only and is reversible; it does not block contact. The Block control is explicitly unavailable because there is no blocking API. Conversation reporting opens an email draft for the user to review/send; the application does not silently send email or claim a chat-report API exists.

Neither credit tier nor paid membership is presented as an identity check. Public locality is still a user-entered string; helper text warns against private addresses, but the unchanged backend cannot guarantee that a user has not entered one. A structured private-address model, enforceable account blocking and detailed spam reasons require a separately scoped backend change.

## Run locally

Backend: install `backend/requirements-dev.txt`, configure a random JWT secret as documented in the repository, then run `uvicorn app.main:app --reload` from `backend`. Frontend: `npm ci`, configure `API_BASE_URL` for that backend, then `npm run dev` from `frontend`.

Checks from `frontend`:

```sh
npm test
npm run build
PYTHON_BIN=/path/to/python npm run test:browser
```

The browser runner starts its own local FastAPI/Next services and uses a temporary SQLite database and temporary test accounts. It never needs real account credentials or real payments. `BROWSER_FOCUSED_ONLY=true` runs the additional feature checks without the full route matrix.

## Verification

- PASS: 19 unit tests, including both semantic-token AA contrast checks and the existing proxy security regression tests.
- PASS: production build.
- PASS: npm audit — zero reported vulnerabilities.
- PASS: 104 page/view × viewport checks with no page-wide overflow, missing primary headings, small button heights, unexpected error boundaries or browser console errors.
- PASS: axe WCAG 2 A/AA + WCAG 2.1 AA checks found no serious/critical violations in the tested states. Thirteen additional dark-mode scans, preview and report-dialog scans passed. This is not certified WCAG conformance or an exhaustive test of every dynamic variant.
- PASS: keyboard sign-in/password toggle, blur validation, full keyboard notice creation/preview, keyboard response, real post report visible in admin, hide/restore, persisted Gujarati/Hindi controls and five simulated failed-request recovery states.
- PASS: backend Python source matches the pre-change snapshot byte for byte.

| Page/view                     | 360px | 390px | 768px | 1280px | Serious/critical axe |
| ----------------------------- | ----- | ----- | ----- | ------ | -------------------- |
| `/`                           | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/noticeboard`                | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/about`                      | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/pricing`                    | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/references`                 | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/contact`                    | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/privacy`                    | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/terms`                      | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/cookies`                    | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/refunds`                    | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/accessibility`              | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/login`                      | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/signup`                     | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/create-post`                | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/settings`                   | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/settings?tab=security`      | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/settings?tab=trust`         | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/settings?tab=notifications` | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/settings?tab=billing`       | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/notifications`              | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/inbox`                      | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/admin`                      | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/admin/verifications`        | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/post/[id]`                  | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/profile/[id]`               | PASS  | PASS  | PASS  | PASS   | PASS                 |
| `/messages/[id]`              | PASS  | PASS  | PASS  | PASS   | PASS                 |

The viewport PASS columns cover the automated layout checks, not every human-factors criterion. Physical Android/TalkBack, 200% zoom and real-network testing remain pending. Existing long-form English explanatory/legal copy and user-entered locality strings are documented limitations.

## Follow-up scope

Physical Android/TalkBack, on-screen keyboard and 200% zoom testing; native-speaker proofreading of Gujarati/Hindi and translation of remaining explanatory copy; durable backend storage and SMTP configuration; server-enforced block/report handling for conversations and structured private-address separation. Existing dark mode is included, not deferred. No payment gateway or map service was added.

## Changed files

- `docs/UI_UPGRADE.md`
- `frontend/app/admin/page.js`
- `frontend/app/admin/verifications/page.js`
- `frontend/app/create-post/page.js`
- `frontend/app/globals.css`
- `frontend/app/inbox/page.js`
- `frontend/app/layout.js`
- `frontend/app/messages/[id]/page.js`
- `frontend/app/not-found.js`
- `frontend/app/noticeboard/page.js`
- `frontend/app/notifications/page.js`
- `frontend/app/page.js`
- `frontend/app/post/[id]/page.js`
- `frontend/app/pricing/page.js`
- `frontend/app/profile/[id]/page.js`
- `frontend/app/settings/page.js`
- `frontend/components/AccountPanels.js`
- `frontend/components/AppShell.js`
- `frontend/components/AuthForm.js`
- `frontend/components/Avatars.js`
- `frontend/components/BottomNav.js`
- `frontend/components/EmptyState.js`
- `frontend/components/Fields.js`
- `frontend/components/FormFeedback.js`
- `frontend/components/InvoiceList.js`
- `frontend/components/MFASettings.js`
- `frontend/components/Nav.js`
- `frontend/components/PasswordSettings.js`
- `frontend/components/PostCard.js`
- `frontend/components/PostImage.js`
- `frontend/components/RecoveryPanel.js`
- `frontend/components/SafetyMenu.js`
- `frontend/components/TrustReview.js`
- `frontend/components/ui/index.js`
- `frontend/lib/i18n.js`
- `frontend/lib/legal.js`
- `frontend/lib/messages/en.json`
- `frontend/lib/messages/gu.json`
- `frontend/lib/messages/hi.json`
- `frontend/package-lock.json`
- `frontend/package.json`
- `frontend/tailwind.config.js`
- `frontend/tests/browser-checks.mjs`
