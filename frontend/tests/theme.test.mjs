import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { themeScript } from "../lib/theme-script.js";

function bootstrap(stored, dark = false, blocked = false) {
  const document = { documentElement: { dataset: {} } };
  const localStorage = {
    getItem() { if (blocked) throw Error("Storage unavailable"); return stored; },
    setItem(key, value) { stored = value; },
  };
  vm.runInNewContext(themeScript, { document, localStorage, matchMedia: () => ({ matches: dark }) });
  return { theme: document.documentElement.dataset.theme, stored };
}

test("theme choices survive reload and do not follow later OS preferences", () => {
  assert.deepEqual(bootstrap("light", true), { theme: "light", stored: "light" });
  assert.deepEqual(bootstrap("dark", false), { theme: "dark", stored: "dark" });
});
test("legacy system choices migrate to an explicit theme", () => {
  assert.deepEqual(bootstrap("system", true), { theme: "dark", stored: "dark" });
  assert.deepEqual(bootstrap("system", false), { theme: "light", stored: "light" });
});
test("missing, invalid and blocked storage leave a usable light theme", () => {
  for (const value of [null, "invalid"]) assert.equal(bootstrap(value, true).theme, "light");
  assert.equal(bootstrap(null, true, true).theme, "light");
});
