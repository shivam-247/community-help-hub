// UI regressions against the production build; API responses are isolated fixtures.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
const base = process.env.UI_TEST_URL || "http://127.0.0.1:3100";
const output = process.env.UI_TEST_OUTPUT || "/tmp/chh-navigation-checks";
mkdirSync(output, { recursive: true });
const server = process.env.UI_TEST_START === "1" ? spawn(process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", new URL(base).port || "3100"],
  { stdio: "ignore", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } }) : null;
if (server) {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(base, { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) { server.kill("SIGTERM"); throw Error("UI test server did not start"); }
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH || undefined, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const errors = [], checks = [];
const publicRoutes = ["/", "/signup", "/login", "/noticeboard", "/pricing", "/about", "/contact", "/references", "/privacy", "/terms", "/cookies", "/refunds", "/accessibility"];
try {
  for (const touch of [false, true]) {
    const context = await browser.newContext({ hasTouch: touch, viewport: { width: 390, height: 900 } });
    await context.route("**/api/backend/**", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/auth/me")) return route.fulfill({ status: 401, json: { detail: "Not authenticated" } });
      if (path.endsWith("/posts/feed")) return route.fulfill({ json: { items: [], total: 0, page: 1, page_size: 12, has_more: false } });
      if (path.endsWith("/posts")) return route.fulfill({ json: [] });
      return route.fulfill({ status: 503, json: { detail: "Test service unavailable" } });
    });
    const page = await context.newPage();
    page.on("pageerror", e => errors.push(e.message));
    for (const width of [360, 390, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of publicRoutes) {
        await page.goto(base + route);
        await page.locator("main h1").waitFor();
        await page.waitForFunction(() => document.querySelector('.theme-switch button[aria-pressed="true"]'));
        const dock = page.getByRole("navigation", { name: "Quick navigation" });
        assert.equal(await dock.isVisible(), touch && width < 1024, `${touch ? "touch" : "desktop"} ${width} ${route}: dock`);
        assert.equal(await page.locator(".theme-switch button").count(), 2);
        for (const theme of ["dark", "light"]) {
          const button = page.getByRole("button", { name: `Use ${theme} theme`, exact: true });
          await button.click();
          assert.equal(await button.getAttribute("aria-pressed"), "true");
          assert.equal(await page.locator("html").getAttribute("data-theme"), theme);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} ${width} ${theme}: overflow`);
        }
        if (route === "/signup") {
          assert.equal(await page.locator("#auth-name").inputValue(), "");
          assert.equal(await page.locator("#auth-locality").inputValue(), "");
          const box = await page.locator(".auth-consent").boundingBox();
          const heading = await page.locator("#signup-consent-heading").boundingBox();
          assert.ok(heading.x >= box.x && heading.y > box.y && heading.x + heading.width <= box.x + box.width + 1 && heading.y + heading.height < box.y + box.height, "Consent heading must stay inside its box");
          if (touch && width < 1024) assert.equal(await dock.locator('[aria-current="page"]').getAttribute("href"), "/login");
        }
        checks.push(`${touch ? "touch" : "desktop"} ${width} ${route}`);
      }
    }
    // Navigation must update its active item after an actual client-side transition.
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(base + "/signup");
    if (touch) {
      const dock = page.getByRole("navigation", { name: "Quick navigation" });
      await dock.getByRole("link", { name: "Feed", exact: true }).click();
      await page.waitForURL("**/noticeboard**");
      assert.equal(await dock.locator('[aria-current="page"]').getAttribute("href"), "/noticeboard");
    } else {
      await page.getByRole("button", { name: "Open navigation", exact: true }).click();
      await page.locator("#mobile-navigation").getByRole("link", { name: "Feed", exact: true }).click();
      await page.waitForURL("**/noticeboard**");
      assert.equal(await page.locator("#mobile-navigation").count(), 0, "Header menu should close on navigation");
    }
    await page.getByRole("button", { name: "Giveaways", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Giveaways", exact: true }).getAttribute("aria-pressed"), "true");
    assert.equal(await page.getByRole("button", { name: "All posts", exact: true }).getAttribute("aria-pressed"), "false");
    await page.goto(base + "/signup");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await page.getByText("Enter your full name", { exact: true }).waitFor();
    await page.locator("#auth-privacy_consent").focus();
    await page.keyboard.press("Space");
    assert.equal(await page.locator("#auth-privacy_consent").isChecked(), true);
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#auth-terms_accepted").evaluate(el => el === document.activeElement), true);
    await page.getByRole("button", { name: "Show password", exact: true }).click();
    assert.equal(await page.locator("#auth-password").getAttribute("type"), "text");
    await page.getByRole("button", { name: "Use dark theme", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "Use dark theme", exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('.theme-switch button[aria-label="Use dark theme"]').getAttribute('aria-pressed') === 'true');
    await page.emulateMedia({ colorScheme: "light" });
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    await page.screenshot({ path: `${output}/signup-${touch ? "touch" : "desktop"}.png`, fullPage: true });
    for (const route of ["/signup", "/login", "/noticeboard"]) {
      await page.goto(base + route);
      await page.addScriptTag({ content: readFileSync(resolve("node_modules/axe-core/axe.min.js"), "utf8") });
      const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.filter(v => ["serious", "critical"].includes(v.impact)).map(v => `${v.id}: ${v.nodes.map(n => n.target).join(", ")}`));
      assert.deepEqual(violations, [], `${route}: accessibility`);
    }
    await context.close();
  }
  assert.deepEqual(errors, [], "Browser runtime errors");
  writeFileSync(`${output}/results.json`, JSON.stringify({ checks, errors, accessibility: "No serious or critical axe findings on signup, login or feed" }, null, 2));
  console.log(`PASS: ${checks.length} page/viewport/input checks, both themes, consent containment, navigation transitions, validation and axe.`);
} finally { await browser.close(); server?.kill("SIGTERM"); }
