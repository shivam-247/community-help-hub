# Navigation and signup refinements

- Bottom navigation is available for compact touch layouts only. Resizing a desktop window keeps navigation in the header. The active item follows the route; Post is highlighted only on the creation page.
- Light and dark are the only theme choices at every width. A saved system choice migrates once to its resolved light/dark value, and subsequent operating-system changes do not override the user's selection.
- Signup and profile fields use neutral name prompts and varied area examples. These are placeholders, not submitted defaults. Noticeboard search accepts any area or PIN code.
- The signup consent heading sits inside its panel. The fieldset retains an accessible group name, validation messages and unchecked consent boxes.
- Next.js is patched from 16.4.0 to 16.4.3 after dependency audit findings. Backend files and API contracts are unchanged.

## Verification

Run `npm ci`, `npm test` and `npm run build` from `frontend`.
Run `UI_TEST_START=1 node tests/navigation-browser.mjs` to start the built app
and run the focused browser checks. Set `UI_TEST_URL`
for another server address, or `UI_CHROME_PATH` for an installed Chromium.
Install Chromium first with `npx playwright install chromium` if needed.

The focused browser suite uses isolated API fixtures. It checks all public
pages at 360, 390, 768, 1024 and 1280px with desktop and touch input, both
themes, consent containment, active navigation, form validation, keyboard
checkboxes and axe checks on signup, login and the noticeboard. It does not
validate production account credentials, email delivery or backend mutations.
The existing full browser suite uses touch input for its mobile layout checks.
