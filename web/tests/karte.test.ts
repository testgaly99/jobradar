import test from "node:test";
import assert from "node:assert/strict";
import { gehaltText, tageSeit, naechsterTermin } from "../lib/karte.ts";

test("gehaltText: Steckbrief-Spanne, Einzelwert CHF, Wunsch, leer", () => {
  assert.equal(gehaltText({ angebot_fix: " " }, { gehalt: { min: 70000, max: 85000, waehrung: "EUR", zeitraum: "Jahr" } }), "70.000–85.000 € / Jahr");
  assert.equal(gehaltText({}, { gehalt: { min: 5000, max: null, waehrung: "CHF", zeitraum: "Monat" } }), "5.000 CHF / Monat");
  assert.equal(gehaltText({ gehalt_wunsch: "80k" }, null), "80k");
  assert.equal(gehaltText({ angebot_fix: "", gehalt_wunsch: " " }, { gehalt: {} }), null);
  assert.equal(gehaltText({}, null), null);
});
test("tageSeit", () => {
  assert.equal(tageSeit([{ datum: "2026-11-01T10:00:00Z" }], "2026-10-01T00:00:00Z", "2026-11-11"), 10);
  assert.equal(tageSeit([], "2026-10-01T00:00:00Z", "2026-11-11"), 41);
});
test("naechsterTermin", () => {
  assert.deepEqual(naechsterTermin([{ datum: "2026-11-10", text: "a" }, { datum: "2026-11-12T09:00:00Z", text: "b" }], "2026-11-11"), { datum: "2026-11-12T09:00:00Z", text: "b" });
  assert.equal(naechsterTermin([{ datum: null, text: "x" }], "2026-11-11"), null);
});
