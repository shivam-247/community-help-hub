import test from "node:test";
import assert from "node:assert/strict";
import { api } from "../lib/api.js";

test("returns bounded list metadata without changing ordinary response shape", async (t) => {
  const saved = global.fetch;
  t.after(() => {
    global.fetch = saved;
  });
  global.fetch = async () =>
    Response.json([{ id: 1 }], { headers: { "x-has-more": "true" } });
  assert.deepEqual(await api("/posts"), [{ id: 1 }]);
  assert.deepEqual(await api("/posts", { pagination: true }), {
    items: [{ id: 1 }],
    has_more: true,
  });
});
test("turns invalid/HTML upstream payloads into a recoverable client error", async (t) => {
  const saved = global.fetch;
  t.after(() => {
    global.fetch = saved;
  });
  global.fetch = async () => new Response("<html>Unavailable</html>");
  await assert.rejects(api("/posts"), /unexpected response/);
  global.fetch = async () =>
    Response.json(
      { detail: "Temporarily unavailable", request_id: "support-reference" },
      { status: 503 },
    );
  await assert.rejects(api("/posts"), /support-reference/);
});
