import test from "node:test";
import assert from "node:assert/strict";
import { scharfGenug } from "../lib/logo-qualitaet.ts";

test("scharfGenug: mindestens doppelte Anzeigegröße", () => {
  assert.equal(scharfGenug(32, 40), false); // Favicon 32 px in 40-px-Kreis: unscharf
  assert.equal(scharfGenug(79, 40), false);
  assert.equal(scharfGenug(80, 40), true);
  assert.equal(scharfGenug(180, 40), true); // apple-touch-icon
  assert.equal(scharfGenug(48, 24), true);
  assert.equal(scharfGenug(0, 24), false); // SVG ohne Maße o. ä. kommt als 0 an
});
test("scharfGenug: SVG ist immer scharf", () => {
  assert.equal(scharfGenug(0, 40, "https://x.de/logo.svg"), true);
  assert.equal(scharfGenug(0, 40, "https://x.de/logo.SVG?v=2"), true);
  assert.equal(scharfGenug(16, 40, "https://x.de/favicon.ico"), false);
});
