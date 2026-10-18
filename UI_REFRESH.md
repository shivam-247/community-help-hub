# Lavender Meadow release

The live Community Help Hub now uses the approved Lavender Meadow direction: a lavender–pink gradient, deep purple text, coral headline accent, sage secondary action, serif headings, frosted surfaces and yellow/blue/pink discovery tiles. Dark mode uses matching plum surfaces. Existing framework versions and dependencies remain unchanged; no UI or animation packages were added.

The landing page uses bounded public API queries for notices and category totals. Discovery tiles open real filtered feeds; Ask/Offer actions open preselected posting forms. The sign-in and account-creation journey preserves the original action and private community query. No invented community totals, testimonials, verified-user guarantees or inactive placeholder buttons are presented as real activity. The kindness section points to real conversations; a recently resolved public notice can be linked when present in the latest preview.

## Mobile review fixes

- Status/error pop-ups sit above the floating mobile dock, including its safe-area inset, rather than covering navigation. Empty notification containers do not intercept taps. This applies through the tablet breakpoint; desktop pop-ups retain the usual bottom-corner position.
- The noticeboard has a compact mobile heading and no duplicate posting CTA above the feed. Search has an accessible hidden label, filters remain in the keyboard-accessible sheet, and a first-notice-title visibility check guards against pushing notices beneath the dock.
- Buttons retain 44px targets and visible focus. Hover/reveal motion respects reduced-motion preferences. Contrast tests cover shared light/dark tokens; coral text uses a dark edge in light mode, and the exact sage action uses large bold white text.

## Files

- `frontend/app/page.js`: full landing page, public API data, real actions and loading/error/empty states.
- `frontend/app/globals.css`: shared palette, gradient, glass surfaces, motion, serif headings, dock and notification clearance.
- `frontend/app/layout.js`: locally bundled serif font, with existing multilingual sans fallbacks retained.
- `frontend/components/Nav.js`: Help Hub wordmark and working shared navigation.
- `frontend/components/PostCard.js` and `frontend/components/ui/index.js`: consistent cards and controls; existing accessibility primitives retained.
- `frontend/components/ToastProvider.js`: safe notification positioning and neutral slow-server message.
- `frontend/app/noticeboard/page.js`: compact mobile feed and category query support.
- `frontend/app/create-post/page.js`, `frontend/lib/use-require-auth.js`, `frontend/components/AuthForm.js`: preserve posting intent across authentication and preselect valid post types.
- `frontend/tests/browser-checks.mjs`: posting intent, signed-out mobile layout, toast clearance, notice visibility and existing end-to-end checks.

## Run and verify

Follow the backend environment setup in README; keep JWT/MFA secrets outside Git. From `backend`, start `uvicorn app.main:app --reload`. From `frontend`, configure `API_BASE_URL=http://127.0.0.1:8000`, then run `npm ci` and `npm run dev`.

Checks from `frontend`: `npm test`, `npm run build`, and `PYTHON_BIN=/path/to/python npm run test:browser`. The browser runner creates a temporary database, random accounts and mock checkout; it does not send mail or write live user data. It covers all 26 routes at 360, 768, 1024 and 1440px, and real signup/login/posting/chat/billing flows. Review home/feed in both themes, category links, sign-in/account-creation return paths, error retries, keyboard focus, sheets, safe-area navigation and pop-up clearance.

## Validation

The 19 frontend tests pass, including semantic colour contrast in both themes and API-proxy security checks. The full browser run passed 104 route/viewport checks plus the added first-notice and toast-clearance assertions. A second targeted run passed the revised signed-out mobile and sign-in/sign-up return-path flow, core API flows, and billing/invoice checks at four widths. Home/feed screenshots were visually reviewed in light/dark mode at mobile and desktop widths. The production build passes.

## Existing operational limits

The free backend can sleep; the app displays a neutral waking-up notice, retry states and a bounded timeout. A first load is not guaranteed to be instant. Persistent database/image storage and SMTP configuration remain necessary before public production use. Checkout remains a no-charge practice flow. This release changes the frontend and does not alter backend secrets, permissions, billing enforcement or the data schema.
