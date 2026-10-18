import { chromium } from "playwright";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
const root = resolve(import.meta.dirname, "../.."),
  temporary = mkdtempSync(join(tmpdir(), "chh-browser-"));
const python = process.env.PYTHON_BIN || "python",
  port = Number(process.env.BROWSER_PORT || 3100),
  apiPort = Number(process.env.BROWSER_API_PORT || 8100);
const base = `http://127.0.0.1:${port}`,
  backend = `http://127.0.0.1:${apiPort}`;
const password = randomBytes(24).toString("base64url"),
  email = `browser-${randomBytes(5).toString("hex")}@example.com`;
const hash = execFileSync(
  python,
  [
    "-c",
    "import sys; from argon2 import PasswordHasher; print(PasswordHasher().hash(sys.stdin.read()))",
  ],
  { input: password, encoding: "utf8" },
).trim();
const env = {
  ...process.env,
  APP_ENV: "test",
  DATABASE_URL: `sqlite:///${temporary}/test.db`,
  JWT_SECRET_KEY: randomBytes(48).toString("hex"),
  MFA_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
  ADMIN_BOOTSTRAP_EMAIL: email,
  ADMIN_BOOTSTRAP_PASSWORD_HASH: hash,
  ADMIN_BOOTSTRAP_NAME: "Browser Administrator",
  DEMO_SEED_ENABLED: "true",
  MOCK_CHECKOUT_ENABLED: "true",
  APP_ORIGIN: base,
  API_BASE_URL: backend,
  NEXT_TELEMETRY_DISABLED: "1",
};
const services = [];
let browser;
const checks = [],
  errors = [];
let phase = "startup";
let expectedNetworkFailure = false;
function serve(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  services.push(child);
  child.stdout.on("data", (d) =>
    writeFileSync(join(temporary, "server.log"), d, { flag: "a" }),
  );
  child.stderr.on("data", (d) =>
    writeFileSync(join(temporary, "server.log"), d, { flag: "a" }),
  );
  return child;
}
async function ready(url) {
  const end = Date.now() + 120000;
  while (Date.now() < end) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw Error(`Server not ready: ${url}`);
}
async function request(path, token, method = "GET", body) {
  const r = await fetch(backend + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  assert.ok(r.ok, `${method} ${path}: ${r.status} ${JSON.stringify(data)}`);
  return data;
}
try {
  serve(
    python,
    [
      "-m",
      "uvicorn",
      "app.main:app",
      "--host",
      "127.0.0.1",
      "--port",
      String(apiPort),
    ],
    join(root, "backend"),
  );
  await ready(backend + "/health");
  serve(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--webpack",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    join(root, "frontend"),
  );
  await ready(base);
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
      viewport: { width: 1024, height: 900 },
    }),
    page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`${phase}: ${e.message}`));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !m.text().includes("401 (Unauthorized)") &&
      !(expectedNetworkFailure && m.text().includes("503"))
    )
      errors.push(`${phase}: ${m.text()}`);
  });
  phase = "signed-out mobile landing";
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto(base + "/");
  await page.getByRole("heading", { name: /Find a helping hand/ }).waitFor();
  await page.getByRole("link", { name: "Offer help", exact: true }).waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Signed-out mobile landing overflow",
  );
  await page.screenshot({
    path: join(temporary, "home-anonymous-360.png"),
    fullPage: false,
    caret: "initial",
  });
  phase = "signup";
  await page.goto(base + "/signup");
  await page
    .getByRole("heading", { name: "Join your neighbourhood", exact: true })
    .waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Signed-out navigation should fit on mobile",
  );
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByText("Enter your full name", { exact: true }).waitFor();
  await page.locator("#auth-name").fill("Browser Neighbour");
  await page
    .locator("#auth-email")
    .fill(`neighbour-${randomBytes(5).toString("hex")}@example.com`);
  await page.locator("#auth-password").fill(password);
  await page.locator("#auth-locality").fill("Gota, Ahmedabad");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  assert.equal(
    await page.locator("#auth-password").getAttribute("type"),
    "text",
  );
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  for (const id of ["privacy_consent", "terms_accepted", "adult_confirmed"])
    await page.locator(`#auth-${id}`).check();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.waitForURL("**/noticeboard");
  const neighbour = (await context.cookies()).find(
    (c) => c.name === "chh_session",
  ).value;
  await context.clearCookies();
  phase = "login";
  await page.goto(base + "/");
  await page.getByRole("link", { name: "Offer help", exact: true }).click();
  await page.waitForURL(/\/login\?next=/);
  await page
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  await page.waitForURL(/\/signup\?next=/);
  await page
    .locator("main")
    .getByRole("link", { name: "Sign in", exact: true })
    .click();
  await page.waitForURL(/\/login\?next=/);
  await page.locator("#auth-email").fill(email);
  await page.locator("#auth-password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/create-post\?type=/);
  await page.waitForFunction(
    () => document.querySelector('select[name="type"]')?.value === "Offer help",
  );
  assert.equal(new URL(page.url()).searchParams.get("type"), "Offer help");
  let token = (await context.cookies()).find(
    (c) => c.name === "chh_session",
  ).value;
  phase = "checkout";
  await page.goto(base + "/pricing");
  await page
    .getByRole("button", { name: "Try Plus test checkout", exact: true })
    .click();
  await page.waitForURL("**/settings?tab=billing");
  await page
    .getByText("Unlimited allowance", { exact: false })
    .first()
    .waitFor();
  phase = "invoice preview and download";
  await page.setViewportSize({ width: 360, height: 900 });
  await page
    .getByRole("button", { name: /View test invoice/ })
    .first()
    .click();
  await page.getByRole("heading", { name: /Test invoice CHH-/ }).waitFor();
  await page.getByText("Valid until", { exact: true }).waitFor();
  await page.getByText("Actually charged", { exact: true }).waitFor();
  assert.ok((await page.getByRole("dialog").textContent()).includes("IST"));
  assert.ok(
    (await page.getByRole("dialog").textContent()).includes("INR 0.00"),
  );
  await page.screenshot({
    path: join(temporary, "invoice-mobile.png"),
    fullPage: false,
    caret: "initial",
  });
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download invoice (HTML)" }).click();
  const download = await downloadEvent,
    receiptFile = join(temporary, "receipt.html");
  await download.saveAs(receiptFile);
  assert.match(readFileSync(receiptFile, "utf8"), /No money was charged/);
  assert.match(download.suggestedFilename(), /CHH-.*-test-invoice.html/);
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.setViewportSize({ width: 1024, height: 900 });
  phase = "create post";
  await page.goto(base + "/create-post");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Books to share with Gota neighbours");
  await page
    .getByLabel("Area / society", { exact: true })
    .fill("Gota, Ahmedabad");
  await page
    .getByLabel("Details", { exact: true })
    .fill(
      "Gujarati medium school books are available to collect at our society gate this weekend. Please message to arrange a time.",
    );
  await page
    .getByRole("button", { name: "Preview notice", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page
    .getByRole("button", { name: "Publish notice", exact: true })
    .click();
  await page.waitForURL(/\/post\/\d+$/);
  const postId = Number(new URL(page.url()).pathname.split("/").at(-1));
  await page
    .getByRole("heading", {
      name: "Books to share with Gota neighbours",
      exact: true,
    })
    .waitFor();
  const verification = await request(
    "/verification/submit",
    neighbour,
    "POST",
    {
      proof_type: "Reference",
      proof_value:
        "The secretary of our Gota test society has agreed to vouch for this demonstration account.",
    },
  );
  await request(`/admin/verifications/${verification.id}`, token, "PATCH", {
    approve: true,
  });
  const response = await request(
    `/posts/${postId}/respond`,
    neighbour,
    "POST",
    { message: "I can collect the books this weekend." },
  );
  await request(`/requests/${response.id}`, token, "PATCH", {
    action: "accept",
  });
  for (let i = 0; i < 23; i++)
    await request(`/requests/${response.id}/messages`, neighbour, "POST", {
      text: `History message ${i}`,
    });
  phase = "chat";
  await page.goto(`${base}/messages/${response.id}`);
  await page.getByText("History message 22", { exact: true }).waitFor();
  await page
    .getByLabel("Message to your neighbour")
    .fill("Please meet at the society gate at six.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await page
    .getByText("Please meet at the society gate at six.", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Older messages", exact: true })
    .click();
  await page.getByText("History message 0", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Latest messages / retry", exact: true })
    .click();
  // Seed additional notices through the actual API to exercise the second feed page.
  for (let i = 0; i < 9; i++)
    await request("/posts", token, "POST", {
      type: "Offer help",
      title: `Neighbourhood books collection number ${i}`,
      description:
        "School books are available for neighbours to collect this weekend from our society reception.",
      locality: "Gota, Ahmedabad",
      category: "Donations & Giveaways",
    });
  phase = "pagination";
  await page.goto(base + "/noticeboard");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.getByText(/^Page 2/).waitFor();
  await page
    .getByRole("button", { name: "Previous page", exact: true })
    .click();
  phase = "area search and filters";
  await page.goto(base + "/");
  await page.getByLabel("What’s happening in your area?").fill("Gota");
  await page.getByRole("button", { name: "Find posts", exact: true }).click();
  await page.waitForURL("**/noticeboard?locality=Gota");
  await page.waitForFunction(
    () => document.querySelector("#post-area")?.value === "Gota",
  );
  assert.equal(await page.locator("#post-area").inputValue(), "Gota");
  await page.locator(".post-card").first().waitFor();
  await page.getByRole("button", { name: "More filters", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.locator("#post-type").selectOption("Offer help");
  await page
    .getByRole("button", { name: "Close filters", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .first()
    .click();
  const routes = [
    "/",
    "/noticeboard",
    "/about",
    "/pricing",
    "/references",
    "/contact",
    "/privacy",
    "/terms",
    "/cookies",
    "/refunds",
    "/accessibility",
    "/login",
    "/signup",
    "/create-post",
    "/settings",
    "/settings?tab=security",
    "/settings?tab=trust",
    "/settings?tab=notifications",
    "/settings?tab=billing",
    "/notifications",
    "/inbox",
    "/admin",
    "/admin/verifications",
    `/post/${postId}`,
    `/profile/${response.requester_id}`,
    `/messages/${response.id}`,
  ];
  const checkedRoutes =
    process.env.BROWSER_FOCUSED_ONLY === "true"
      ? []
      : process.env.BROWSER_INVOICE_ONLY === "true"
        ? ["/settings?tab=billing"]
        : routes;
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of checkedRoutes) {
      phase = `${width} ${route}`;
      try {
        await page.goto(base + route, { waitUntil: "domcontentloaded" });
      } catch (error) {
        if (!error.message.includes("net::ERR_ABORTED")) throw error;
        await page.goto(base + route, { waitUntil: "domcontentloaded" });
      }
      await page.locator("main").waitFor();
      await page.locator("main h1").waitFor({ timeout: 15000 });
      // Dev CSS chunks can arrive after streamed HTML, especially on CI.
      // Wait for usable controls rather than measuring an unstyled first paint.
      await page.waitForFunction(
        () => {
          const header = document.querySelector("header");
          return (
            header &&
            getComputedStyle(header).position === "sticky" &&
            [...document.querySelectorAll("button")].every((b) => {
              const rect = b.getBoundingClientRect();
              return !rect.width || rect.height >= 43;
            })
          );
        },
        null,
        { timeout: 15000 },
      );
      await page.waitForTimeout(500);
      await page.addScriptTag({
        path: join(root, "frontend/node_modules/axe-core/axe.min.js"),
      });
      const violations = await page.evaluate(async () => {
        const result = await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        });
        return result.violations
          .filter((v) => ["critical", "serious"].includes(v.impact))
          .map(
            (v) =>
              `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
          );
      });
      assert.deepEqual(
        violations,
        [],
        `${phase} accessibility: ${violations.join("; ")}`,
      );
      const state = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        heading: !!document.querySelector("main h1"),
        text: document.querySelector("main")?.textContent || "",
        smallButtons: [...document.querySelectorAll("button")]
          .filter(
            (b) =>
              b.getBoundingClientRect().width &&
              b.getBoundingClientRect().height < 43,
          )
          .map((b) => b.getAttribute("aria-label") || b.textContent),
      }));
      assert.ok(
        state.scroll <= state.width + 1,
        `${phase} horizontal overflow ${state.scroll}/${state.width}`,
      );
      assert.ok(
        !state.text.includes("This page could not be loaded"),
        `${phase} error boundary`,
      );
      assert.ok(
        !state.text.includes("Cannot check your session"),
        `${phase} session failed`,
      );
      assert.ok(state.heading, `${phase} missing primary heading`);
      assert.equal(
        state.smallButtons.length,
        0,
        `${phase} small controls: ${state.smallButtons}`,
      );
      if (route === "/settings?tab=billing") {
        await page
          .getByRole("button", { name: /View test invoice/ })
          .first()
          .click();
        await page.getByText("Valid until", { exact: true }).waitFor();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "Invoice panel overflow",
        );
        await page.keyboard.press("Escape");
      }
      if (
        [360, 1280].includes(width) &&
        ["/", "/noticeboard"].includes(route)
      ) {
        if (route === "/noticeboard") {
          await page.locator(".post-card").first().waitFor();
          if (width === 360) {
            const title = await page
              .locator(".post-card h3")
              .first()
              .boundingBox();
            const dock = await page
              .getByRole("navigation", { name: "Quick navigation" })
              .boundingBox();
            assert.ok(
              title.y + title.height < dock.y,
              "First notice title should appear above the mobile dock without scrolling",
            );
          }
        }
        for (const theme of ["dark", "light"]) {
          await page
            .getByRole("button", { name: `Use ${theme} theme`, exact: true })
            .click();
          await page.waitForFunction(
            (value) => document.documentElement.dataset.theme === value,
            theme,
          );
          assert.equal(
            await page.evaluate(() => localStorage.getItem("chh-theme")),
            theme,
          );
          await page.waitForTimeout(200);
          await page.screenshot({
            path: join(
              temporary,
              `${route === "/" ? "home" : "feed"}-${width}-${theme}.png`,
            ),
            fullPage: false,
            caret: "initial",
          });
        }
        if (width === 360) {
          const dock = page.getByRole("navigation", {
            name: "Quick navigation",
          });
          assert.ok(await dock.isVisible());
          await page.evaluate(() =>
            window.dispatchEvent(new Event("chh-api-slow")),
          );
          await page
            .getByRole("button", { name: "Dismiss notification", exact: true })
            .waitFor();
          const toast = await page
            .getByRole("button", { name: "Dismiss notification", exact: true })
            .locator("..")
            .boundingBox();
          const navBox = await dock.boundingBox();
          assert.ok(
            toast.y + toast.height < navBox.y,
            "Toast must not cover mobile navigation",
          );
          await page.screenshot({
            path: join(temporary, "toast-above-dock.png"),
            fullPage: false,
            caret: "initial",
          });
          await page
            .getByRole("button", { name: "Dismiss notification", exact: true })
            .click();
          for (const link of await dock.getByRole("link").all()) {
            const box = await link.boundingBox();
            assert.ok(
              box.width >= 44 && box.height >= 44,
              "Mobile navigation tap target",
            );
          }
        }
      }
      checks.push({ width, route, overflow: false });
      console.log(`PASS ${phase}`);
    }
  }
  const features = [];
  async function accessible(label) {
    await page.addScriptTag({
      path: join(root, "frontend/node_modules/axe-core/axe.min.js"),
    });
    const violations = await page.evaluate(async () => {
      const r = await axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      });
      return r.violations
        .filter((v) => ["serious", "critical"].includes(v.impact))
        .map(
          (v) =>
            `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        );
    });
    assert.deepEqual(violations, [], `${label}: ${violations.join("; ")}`);
  }
  phase = "dark mode accessibility";
  await page.setViewportSize({ width: 390, height: 900 });
  for (const route of [
    "/",
    "/noticeboard",
    "/pricing",
    "/settings",
    "/settings?tab=security",
    "/settings?tab=trust",
    "/settings?tab=notifications",
    "/settings?tab=billing",
    "/inbox",
    "/admin",
    `/post/${postId}`,
    `/profile/${response.requester_id}`,
    `/messages/${response.id}`,
  ]) {
    await page.goto(base + route);
    await page.locator("main h1").waitFor();
    await page
      .getByRole("button", { name: "Use dark theme", exact: true })
      .click();
    if (["/", "/noticeboard"].includes(route))
      await page.locator(".post-card").first().waitFor();
    await page.waitForTimeout(400);
    await accessible(`dark ${route}`);
  }
  features.push("13 dark-mode accessibility scans");
  phase = "language controls";
  for (const [language, label] of [
    ["gu", "ઇમેઇલ સરનામું"],
    ["hi", "ईमेल पता"],
  ]) {
    await page.goto(base + "/login");
    await page.getByLabel("Language / ભાષા / भाषा").selectOption(language);
    await page.getByLabel(label, { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(() => document.documentElement.lang),
      language,
    );
    await page.reload();
    await page.getByLabel(label, { exact: true }).waitFor();
    await page.goto(base + `/post/${postId}`);
    await page
      .getByRole("heading", {
        name: "Books to share with Gota neighbours",
        exact: true,
      })
      .waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  await page.getByLabel("Language / ભાષા / भाषा").selectOption("en");
  features.push("Gujarati/Hindi controls persist; user content unchanged");
  phase = "keyboard login";
  await context.clearCookies();
  await page.goto(base + "/login");
  await page.locator("#auth-email").focus();
  await page.keyboard.type(email);
  await page.keyboard.press("Tab");
  await page.keyboard.type(password);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  assert.equal(
    await page.locator("#auth-password").getAttribute("type"),
    "text",
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.waitForURL("**/noticeboard");
  phase = "keyboard create with preview";
  await page.goto(base + "/create-post");
  await page.getByLabel("Title", { exact: true }).focus();
  await page.keyboard.type("Hi");
  await page.keyboard.press("Tab");
  await page.locator("#error-title").waitFor();
  await page.getByLabel("Title", { exact: true }).focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Carry books to our society reception");
  await page.keyboard.press("Tab");
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Gota, Ahmedabad");
  await page.keyboard.press("Tab");
  await page.keyboard.type(
    "Please help carry the school books to our society reception this weekend.",
  );
  await page.keyboard.press("Tab");
  await page.keyboard.type("Near Shiv Mandir");
  for (let i = 0; i < 20; i++) {
    if (
      await page.evaluate(
        () => document.activeElement?.textContent.trim() === "Preview notice",
      )
    )
      break;
    await page.keyboard.press("Tab");
  }
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent.trim()),
    "Preview notice",
  );
  await page.keyboard.press("Enter");
  await page.getByRole("dialog").waitFor();
  await accessible("notice preview");
  for (let i = 0; i < 8; i++) {
    if (
      await page.evaluate(
        () => document.activeElement?.textContent.trim() === "Publish notice",
      )
    )
      break;
    await page.keyboard.press("Tab");
  }
  const publishing = page.waitForRequest(
    (r) => r.url().endsWith("/api/backend/posts") && r.method() === "POST",
  );
  await page.keyboard.press("Enter");
  const payload = (await publishing).postDataJSON();
  assert.ok(payload.description.includes("Near Shiv Mandir"));
  assert.ok(!("landmark" in payload));
  assert.ok(!("contact_phone" in payload));
  await page.waitForURL(/\/post\/\d+$/);
  const keyboardPost = Number(new URL(page.url()).pathname.split("/").at(-1));
  features.push(
    "keyboard login, blur validation, creation and focus-managed preview; original post payload keys",
  );
  phase = "report and hide";
  await context.clearCookies();
  await context.addCookies([
    {
      name: "chh_session",
      value: neighbour,
      url: base,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto(base + `/post/${postId}`);
  await page
    .getByRole("button", {
      name: "Post and conversation safety options",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Report reason", { exact: true })
    .fill("Audit test: please review this notice for misleading details.");
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  await page.getByText(/Report sent/).waitFor();
  await accessible("report confirmation");
  const reports = await request("/admin/reports?page=1&page_size=20", token);
  assert.ok(reports.some((r) => r.reason.includes("Audit test:")));
  await page
    .getByRole("button", { name: "Hide on this device", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "You hid this notice", exact: true })
    .waitFor();
  await page.goto(base + "/noticeboard");
  await page.getByRole("button", { name: /Restore hidden posts/ }).click();
  await page
    .getByRole("heading", {
      name: "Books to share with Gota neighbours",
      exact: true,
    })
    .waitFor();
  await page.goto(base + `/post/${keyboardPost}`);
  await page.getByLabel("Message to the post author", { exact: true }).focus();
  await page.keyboard.type("I can carry the books this weekend.");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.getByText("Response Sent!", { exact: true }).waitFor();
  features.push(
    "report saved to admin queue; session hide/restore; keyboard response",
  );
  await context.clearCookies();
  await context.addCookies([
    {
      name: "chh_session",
      value: token,
      url: base,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  phase = "recovery regression";
  for (const [route, pattern, retry] of [
    [`/post/${postId}`, `**/api/backend/posts/${postId}`, "Try again"],
    [
      "/admin/verifications",
      "**/api/backend/admin/verifications?**",
      "Refresh",
    ],
    [
      "/settings?tab=notifications",
      "**/api/backend/notifications/preferences",
      "Reload account section",
    ],
    [
      "/settings?tab=security",
      "**/api/backend/auth/mfa",
      "Retry authenticator settings",
    ],
    [
      "/settings?tab=trust",
      "**/api/backend/account/trust",
      "Retry verification status",
    ],
  ]) {
    expectedNetworkFailure = true;
    await page.route(pattern, (r) =>
      r.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Simulated service interruption" }),
      }),
    );
    await page.goto(base + route);
    await page
      .getByText("Simulated service interruption", { exact: false })
      .first()
      .waitFor();
    assert.ok(
      await page.getByRole("button", { name: retry, exact: true }).isVisible(),
    );
    const text = await page.locator("main").innerText();
    assert.ok(!/All caught up!|Loading preferences…|0 of 3 checks/.test(text));
    await page.unroute(pattern);
    expectedNetworkFailure = false;
  }
  features.push(
    "five failed-request states keep retry visible without false empty/loading copy",
  );
  console.log(`FEATURE CHECKS PASSED: ${features.join("; ")}`);
  writeFileSync(
    join(temporary, "features.json"),
    JSON.stringify({ features }, null, 2),
  );

  phase = "password controls";
  await page.goto(base + "/settings?tab=security");
  await page.getByRole("button", { name: /Show current password/i }).click();
  assert.equal(
    await page.locator("#password-current").getAttribute("type"),
    "text",
  );
  phase = "theme persistence";
  await page
    .getByRole("button", { name: "Use dark theme", exact: true })
    .click();
  await page.reload();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("chh-theme")),
    "dark",
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  writeFileSync(
    join(temporary, "checks.json"),
    JSON.stringify(
      {
        flows: [
          "signup",
          "login",
          "mock checkout",
          "posting",
          "chat send/history",
          "feed pagination",
          "area search and filters",
          "theme switching and persistence",
          "mobile navigation",
          "toast clearance and first-post visibility",
          "offer intent preserved through sign-in",
          "invoice preview and download",
          "password visibility",
        ],
        checks,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    `VERIFIED ${checks.length} viewport/page checks; real API flows passed. Report: ${temporary}/checks.json`,
  );
} catch (e) {
  console.error(`FAILED ${phase}: ${e.stack}`);
  console.error(`Diagnostic log: ${temporary}/server.log`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  for (const s of services) s.kill("SIGTERM");
}
