# Community Help Hub — bright UI redesign

18 October 2026. This release replaces the muted green treatment in `UI_UPGRADE.md` following the updated design direction.

## Design direction

Warm yellow and white in light mode; deep plum and violet in dark mode. Lavender, blue, amber and coral distinguish notice categories in both themes. Colour is defined once in semantic CSS tokens, including independent foregrounds for readable category labels. Noto Sans remains self-hosted with Gujarati/Devanagari support. Georgia is a system-font accent for a few large editorial headings, with no extra font download.

Glass is limited to the floating header, mobile dock and homepage board preview. Dense forms, policies, chat and notice text retain readable surfaces. An original SVG neighbourhood illustration adapts to the theme, makes no external image requests and includes no tracking. Decorative artwork is hidden from assistive technology; uploaded photos retain their existing image descriptions.

Motion is functional: 160ms button/card feedback and 180ms page/panel entrances, with a global reduced-motion override and a reduced-transparency fallback. Touch controls remain at least 44px. No new npm dependency, UI framework or backend contract was introduced.

## Reference review

These informed the composition and interaction decisions. This is an original implementation, not copied product artwork or a claim to have selected an objectively best interface.

- Airbnb / Google Design, _Communicating Clarity and Charm_ (2016 award case study): labelled bottom navigation, strong type hierarchy and clear primary actions. https://design.google/library/airbnb-invites-you-in
- Airbnb Design, _Building a Visual Language_ (2016): a shared component language across all pages. https://medium.com/airbnb-design/building-a-visual-language-behind-the-scenes-of-our-airbnb-design-system-224748775e4e
- Google Design, _2019 Material Design Award Winners_: consistent theming, meaningful motion and readable active navigation. https://design.google/library/material-design-awards-2019
- Nextdoor, _Meet the New Nextdoor_ (2025): simplify the product around core neighbourhood tasks. https://about.nextdoor.com/press-releases/meet-the-new-nextdoor
- OLIO and Buy Nothing: foreground giving, asking and nearby discovery. https://olioapp.com/en/ and https://buynothingproject.org/
- Lumen UI skill and connected design tokens: selective glass, semantic colours, content spacing and accessible states. Existing Tailwind/Radix primitives were retained rather than migrating the app to a second component runtime.

The previously supplied Claude artifact URL could not be retrieved. Earlier Lavender Meadow preferences in the conversation informed the warmth, mixed colours, glass and editorial heading treatment; pixel-identical fidelity to the inaccessible artifact is not claimed.

## Page changes

| Area                                                | Change and purpose                                                                                                                                                                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared shell                                        | Compact floating glass navigation, consistent hand-heart mark, coloured mobile Post action, grouped footer and safe-area spacing.                                                                                                                                    |
| Home                                                | Split editorial hero with original neighbourhood illustration and real API-backed notice preview; coloured category pathways, area search, nearby notices, how it works, safety tips and useful FAQ. Counts remain real public totals, with sample notices labelled. |
| Noticeboard                                         | Compact utility header, clearer desktop category rail, scrollable mobile chips, sticky search/filter controls, colour-coded cards and retained pagination/recovery states.                                                                                           |
| Sign-in / sign-up                                   | Split desktop story/form layout and a focused single-column phone form. Password reveal, inline validation, pending/disabled states, a success transition and return-to-page behaviour remain functional.                                                            |
| Authenticator                                       | Existing six-digit TOTP flow is clearly explained and styled. No fake email/SMS OTP or new delivery provider is introduced. Setup stays in Account → Security.                                                                                                       |
| Account                                             | A coloured account header, profile/reputation card, clearer tab treatment and consistent form surfaces. Privacy choices, verification, notifications and mock billing remain separate controls.                                                                      |
| Create notice                                       | Write → Preview → Publish orientation, clearer form sections, character count, public-landmark hint and retained real preview/publish flow.                                                                                                                          |
| Post / profile                                      | Quieter, larger reading surfaces, coherent avatars/category colours and clearer response actions. Reporting, session hiding, status changes and review functions are preserved.                                                                                      |
| Inbox / chat                                        | Clearer request/response navigation, consistent exchange cards and a lightly tinted chat canvas. Real message history, SSE updates and reconnect states remain intact.                                                                                               |
| Updates                                             | Consistent heading, mobile refresh control, readable notification cards and retained read/error/empty states.                                                                                                                                                        |
| Pricing                                             | Editorial heading and consistent plan cards, with a distinct Plus treatment and aligned actions. Prices, limits and the test-checkout disclosure remain unchanged.                                                                                                   |
| Moderation                                          | More readable header and consistent surfaces; real reported posts, spam queue and verification controls are retained.                                                                                                                                                |
| About / contact / references                        | Purpose-first composition, original artwork on About, clearer contact information and readable source entries. No invented academic references or operator claims.                                                                                                   |
| Privacy / terms / cookies / refunds / accessibility | Shared policy layout with an on-page contents rail on desktop and a readable article panel. Policy text is preserved.                                                                                                                                                |

## Verification

- `npm test`: 19 tests pass, including semantic foreground/control contrast in both themes, category foregrounds and tinted backgrounds.
- `npm run build`: production compilation and route generation pass.
- Backend `pytest -q test_security.py`: 29 tests pass, including MFA enrollment/replay protection, authorization, upload and session controls. Backend source and API contracts are unchanged.
- Full browser run: **104 page × viewport checks pass** across the 26 views below. Each checks document overflow, usable controls, real headings, error-boundary failures and serious/critical axe findings using WCAG A/AA rules.
- Final visual review and targeted run: **16 additional landing/sign-in checks** cover both themes at all four widths. A real 360px headline word-break found in review was fixed and is now guarded by a browser assertion.
- **13 additional dark-mode accessibility scans**, keyboard login/create/preview/respond, Gujarati/Hindi persistence, report storage, session hide/restore, five simulated failed-request recovery states and real authenticator sign-in pass. Authenticator enrollment is exercised against the isolated API; sign-in without a code fails and sign-in with a valid code returns to the requested account section.
- No unexpected browser console/page errors in the successful runs. The suite intentionally exercises 401 and simulated 503 responses; those are not hidden production failures.

| View                    | 360px | 390px | 768px | 1280px |
| ----------------------- | ----- | ----- | ----- | ------ |
| Home                    | PASS  | PASS  | PASS  | PASS   |
| Noticeboard             | PASS  | PASS  | PASS  | PASS   |
| About                   | PASS  | PASS  | PASS  | PASS   |
| Pricing                 | PASS  | PASS  | PASS  | PASS   |
| References              | PASS  | PASS  | PASS  | PASS   |
| Contact                 | PASS  | PASS  | PASS  | PASS   |
| Privacy                 | PASS  | PASS  | PASS  | PASS   |
| Terms                   | PASS  | PASS  | PASS  | PASS   |
| Cookies                 | PASS  | PASS  | PASS  | PASS   |
| Refunds                 | PASS  | PASS  | PASS  | PASS   |
| Accessibility           | PASS  | PASS  | PASS  | PASS   |
| Sign in                 | PASS  | PASS  | PASS  | PASS   |
| Sign up                 | PASS  | PASS  | PASS  | PASS   |
| Create notice           | PASS  | PASS  | PASS  | PASS   |
| Account / profile       | PASS  | PASS  | PASS  | PASS   |
| Account / security      | PASS  | PASS  | PASS  | PASS   |
| Account / trust         | PASS  | PASS  | PASS  | PASS   |
| Account / notifications | PASS  | PASS  | PASS  | PASS   |
| Account / billing       | PASS  | PASS  | PASS  | PASS   |
| Updates                 | PASS  | PASS  | PASS  | PASS   |
| Inbox                   | PASS  | PASS  | PASS  | PASS   |
| Moderation              | PASS  | PASS  | PASS  | PASS   |
| Verification review     | PASS  | PASS  | PASS  | PASS   |
| Post detail             | PASS  | PASS  | PASS  | PASS   |
| Member profile          | PASS  | PASS  | PASS  | PASS   |
| Private chat            | PASS  | PASS  | PASS  | PASS   |

The matrix is browser emulation and automated accessibility evidence, not a claim of complete WCAG certification. Dark-mode scans cover home, noticeboard, pricing, the five account tabs, inbox, moderation, post, profile and chat; final light/dark checks also cover sign-in. Keyboard flows cover sign-in, creation/preview and responding. Physical-device and screen-reader checks remain useful follow-up work.

## Run locally

Use the existing backend environment variables in `backend/.env.example`. Set a random `JWT_SECRET_KEY` of at least 32 bytes; do not commit secrets. Start the API with `uvicorn app.main:app --reload` from `backend`. In `frontend`, set the server-side `API_BASE_URL` to the local API, then run `npm ci` and `npm run dev`.

Checks: `npm test`, `npm run build`, and `PYTHON_BIN=/path/to/backend/venv/bin/python npm run test:browser` from `frontend`. The browser suite starts isolated services and creates its own temporary database. Do not run the production build and development suite concurrently because both use `.next`.

## Existing operational limits

- Paid checkout is a mock; no real payment is collected.
- Email delivery and email verification depend on a configured SMTP service. Authenticator TOTP already works independently; this release does not claim to send login OTPs.
- Report and session Hide work. Member blocking has no backend endpoint and remains explicitly unavailable.
- Navigation, form labels, categories and status controls have English/Gujarati/Hindi dictionaries. Remaining explanatory/legal copy is English; user content is never automatically translated.
- Browser viewport emulation does not replace testing on a physical Android phone and with a screen reader. Persistent production storage and email delivery are separate deployment concerns.

## Changed files

- `docs/BRIGHT_UI_REDESIGN.md`
- `docs/UI_UPGRADE.md`
- `frontend/app/about/page.js`
- `frontend/app/admin/page.js`
- `frontend/app/contact/page.js`
- `frontend/app/create-post/page.js`
- `frontend/app/globals.css`
- `frontend/app/inbox/page.js`
- `frontend/app/messages/[id]/page.js`
- `frontend/app/noticeboard/page.js`
- `frontend/app/notifications/page.js`
- `frontend/app/page.js`
- `frontend/app/post/[id]/page.js`
- `frontend/app/pricing/page.js`
- `frontend/app/profile/[id]/page.js`
- `frontend/app/references/page.js`
- `frontend/app/settings/page.js`
- `frontend/components/AppShell.js`
- `frontend/components/AuthForm.js`
- `frontend/components/Avatars.js`
- `frontend/components/BottomNav.js`
- `frontend/components/Brand.js`
- `frontend/components/Nav.js`
- `frontend/components/NeighbourhoodScene.js`
- `frontend/components/PageHeader.js`
- `frontend/components/PolicyPage.js`
- `frontend/components/PostCard.js`
- `frontend/components/Skeleton.js`
- `frontend/components/ui/index.js`
- `frontend/tailwind.config.js`
- `frontend/tests/browser-checks.mjs`
- `frontend/tests/contrast.test.mjs`
