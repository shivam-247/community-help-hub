# Community Help Hub interface refresh

## Audit and design decisions

The previous header gave navigation links, theme selection, account actions and posting similar visual weight. Large promotional copy and stacked filters pushed actual notices below the first mobile screen. Serif headings and tightly boxed controls made the application feel more like a project showcase.

The refresh keeps the deep green identity and existing Radix/shadcn-style components. It uses a consistent sans-serif family with Gujarati/Devanagari fallbacks, neutral reading surfaces, green active states, 44px controls and restrained card elevation. Reference: [shadcn blocks](https://ui.shadcn.com/blocks) and [navigation/sidebar patterns](https://ui.shadcn.com/docs/components/sidebar). No third-party photographs, ratings, customer counts or new tracking scripts were added.

## Changed files

- `frontend/components/Nav.js`: quieter desktop links, account menu and mobile bottom navigation; real update/response counts remain connected.
- `frontend/components/ThemeControl.js`: labelled light/system/dark controls; system selection remains available above the narrow mobile breakpoint. Preferences persist locally.
- `frontend/app/layout.js`: shared content width, footer spacing and room for the mobile dock; removed the unused serif font import.
- `frontend/app/globals.css`: consistent typography, charcoal dark theme, light green-neutral canvas, navigation states and card surfaces.
- `frontend/app/noticeboard/page.js`: compact feed heading, desktop category navigation, mobile chips, search and a filter sheet. Area search accepts the home page's query string. Pagination, private society feeds and failure states remain connected.
- `frontend/components/PostCard.js`: author/locality first, clear category/status, readable title and an explicit View post action. Sample notices remain labelled.
- `frontend/app/page.js`: updated home page board and working area/PIN-code search.
- `frontend/tests/browser-checks.mjs`: area-search/filter flow, theme persistence, mobile navigation targets and both-theme screenshots for internal review. Waits for streamed styles before measuring controls.

## Local verification

Use the existing Python environment and `backend/.env.example` configuration; generate a private JWT secret and keep credentials outside Git. Start the backend from `backend` with `uvicorn app.main:app --reload`, then run `npm ci` and `npm run dev` from `frontend` with `API_BASE_URL=http://127.0.0.1:8000`.

Run `npm test`, `npm run build`, and `PYTHON_BIN=/path/to/python npm run test:browser` from `frontend`. The browser runner creates an isolated test database, random account credentials and mock checkout; it does not use production accounts or send real emails.

Manual checks: browse/feed categories; area search; empty/error/retry states; mobile menu and bottom navigation; keyboard focus and Escape in sheets; light/dark persistence; signup/login; checkout and invoice preview/download; posting; private chat; billing and verification links. Check 360px, 768px, 1024px and 1440px widths.

## Results

19 frontend tests passed, including light/dark semantic contrast and proxy protections. The isolated browser suite passed all 104 page/viewport checks and the real API flows; an additional visual pass checked home/feed at all four widths in both themes, including heading wrapping and overflow.

## Remaining operational setup

Checkout is a practice flow and charges INR 0. Receipts can be viewed/downloaded, but live invoice email needs a configured SMTP provider and verified account email. The free Render service still needs durable data/image storage before real public use.
