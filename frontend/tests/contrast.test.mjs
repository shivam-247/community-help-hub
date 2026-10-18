import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
function luminance(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  const rgb = [channel(0), channel(8), channel(4)].map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return rgb.reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}
for (const theme of ["light", "dark"])
  test(`${theme}: semantic text and control colours meet AA contrast`, () => {
    const block = css.split(`html[data-theme="${theme}"] {`)[1].split("}")[0];
    const tokens = Object.fromEntries(
      [...block.matchAll(/--([\w-]+): ([\d.]+) ([\d.]+)% ([\d.]+)%/g)].map(
        (m) => [m[1], luminance(+m[2], +m[3], +m[4])],
      ),
    );
    for (const bg of [
      "canvas",
      "surface",
      "surface-muted",
      "wash",
      "wash-secondary",
    ])
      for (const fg of ["ink", "ink-soft", "ink-muted", "brand"])
        check(fg, bg, 4.5);
    for (const fg of ["success", "warning", "danger", "brand"])
      check(fg, `${fg}-soft`, 4.5);
    check("on-brand", "brand-solid", 4.5);
    check("on-brand", "surface-strong", 4.5);
    for (const category of ["help", "give", "skill", "alert"])
      check(`${category}-ink`, `${category}-surface`, 4.5);
    check("ink-muted", "surface", 3); // form boundaries
    function check(fg, bg, min) {
      const a = tokens[fg],
        b = tokens[bg];
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      assert.ok(ratio >= min, `${fg} on ${bg}: ${ratio.toFixed(2)} < ${min}`);
    }
  });
