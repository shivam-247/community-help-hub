import test from "node:test";
import assert from "node:assert/strict";
import { proxyRequest } from "../lib/proxy.mjs";

class MockResponse extends Response {
  constructor(body, options) {
    super(body, options);
    this.cookieWrites = [];
    this.cookies = { set: (...args) => this.cookieWrites.push(args) };
  }
  static json(body, options) {
    return new MockResponse(JSON.stringify(body), options);
  }
}
function request({
  method = "GET",
  origin = "https://hub.example",
  csrf = "1",
  cookie = "",
  body,
} = {}) {
  const req = new Request("https://hub.example/api/backend/auth/login", {
    method,
    headers: {
      ...(origin ? { Origin: origin } : {}),
      ...(csrf ? { "X-CHH-CSRF": csrf } : {}),
      "Content-Type": "application/json",
    },
    body,
  });
  req.cookies = { get: () => (cookie ? { value: cookie } : undefined) };
  return req;
}
process.env.API_BASE_URL = "https://api.example/";
process.env.APP_ORIGIN = "https://hub.example";

for (const [name, options] of [
  ["cross-origin", { method: "POST", origin: "https://attacker.example" }],
  ["missing Origin", { method: "POST", origin: "" }],
  ["missing CSRF header", { method: "POST", csrf: "" }],
])
  test(`rejects ${name} writes`, async () => {
    const response = await proxyRequest(
      request(options),
      ["auth", "login"],
      MockResponse,
      () => {
        throw Error("Should not forward");
      },
    );
    assert.equal(response.status, 403);
  });

for (const path of [
  ["https:", "attacker.example"],
  ["posts", "..", "auth"],
  ["posts", "%2e%2e"],
  ["uploads", "attack.svg"],
  ["auth", "foo/bar"],
]) {
  test(`rejects unsafe route ${path.join("/")}`, async () => {
    const response = await proxyRequest(request(), path, MockResponse, () => {
      throw Error("Should not forward");
    });
    assert.equal(response.status, 404);
  });
}

test("sets HttpOnly session and strips token from login response", async () => {
  let forwarded;
  const response = await proxyRequest(
    request({ method: "POST", body: '{"email":"neighbor@example.com"}' }),
    ["auth", "login"],
    MockResponse,
    async (url, options) => {
      forwarded = { url, options };
      return Response.json({
        access_token: "sensitive-token",
        token_type: "bearer",
      });
    },
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).access_token, undefined);
  assert.equal(response.cookieWrites[0][1], "sensitive-token");
  assert.equal(response.cookieWrites[0][2].httpOnly, true);
  assert.equal(
    response.cookieWrites[0][2].secure,
    process.env.NODE_ENV === "production",
  );
  assert.equal(response.cookieWrites[0][2].sameSite, "strict");
  assert.equal(forwarded.url.origin, "https://api.example");
  assert.equal(forwarded.options.redirect, "manual");
});

test("forwards cookie as bearer and clears it on logout", async () => {
  let authorization;
  const response = await proxyRequest(
    request({ method: "POST", cookie: "session-token" }),
    ["auth", "logout"],
    MockResponse,
    async (_, options) => {
      authorization = options.headers.get("Authorization");
      return Response.json({ ok: true });
    },
  );
  assert.equal(authorization, "Bearer session-token");
  assert.equal(response.cookieWrites[0][2].maxAge, 0);
});

test("does not follow upstream redirects", async () => {
  const response = await proxyRequest(
    request(),
    ["posts"],
    MockResponse,
    async () =>
      new Response(null, {
        status: 302,
        headers: { Location: "http://169.254.169.254/" },
      }),
  );
  assert.equal(response.status, 502);
});

test("does not expose server exception details", async () => {
  const response = await proxyRequest(
    request(),
    ["posts"],
    MockResponse,
    async () =>
      Response.json({ trace: "credentials in traceback" }, { status: 500 }),
  );
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes("credentials"));
});

test("bounds streaming request bodies", async () => {
  const response = await proxyRequest(
    request({ method: "POST", body: "x".repeat(6 * 1024 * 1024 + 1) }),
    ["posts"],
    MockResponse,
    () => {
      throw Error("Should not forward");
    },
  );
  assert.equal(response.status, 413);
});

test("streams private chat events without buffering and forwards resume position", async () => {
  const req = request({ cookie: "session-cookie" });
  req.headers.set("Last-Event-ID", "42");
  let options;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode('id: 43\ndata: {"id":43}\n\n'),
      );
      controller.close();
    },
  });
  const response = await proxyRequest(
    req,
    ["requests", "1", "events"],
    MockResponse,
    async (_, opts) => {
      options = opts;
      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream" },
      });
    },
  );
  assert.equal(options.headers.get("Authorization"), "Bearer session-cookie");
  assert.equal(options.headers.get("Last-Event-ID"), "42");
  assert.match(await response.text(), /id: 43/);
  assert.equal(response.headers.get("Content-Type"), "text/event-stream");
});

test("preserves pagination headers for collection navigation", async () => {
  const response = await proxyRequest(
    request(),
    ["posts"],
    MockResponse,
    async () =>
      Response.json([], {
        headers: {
          "X-Page": "2",
          "X-Has-More": "true",
          "X-Request-ID": "a".repeat(32),
        },
      }),
  );
  assert.equal(response.headers.get("x-page"), "2");
  assert.equal(response.headers.get("x-has-more"), "true");
  assert.equal(response.headers.get("x-request-id"), "a".repeat(32));
});
