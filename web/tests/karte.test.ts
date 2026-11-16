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
test("gehaltText: andere Währung", () => {
  assert.equal(gehaltText({}, { gehalt: { min: 50000, max: null, waehrung: "USD", zeitraum: "Jahr" } }), "50.000 USD / Jahr");
});

test("gehaltText erhält explizite Jahr-, Monat- und Stundenbeträge ohne Umrechnung", () => {
  for (const [gehalt, erwartet] of [
    [{ min: 70000, max: 85000, waehrung: "EUR", zeitraum: "Jahr" }, "70.000–85.000 € / Jahr"],
    [{ min: 5000, max: 5500, waehrung: "CHF", zeitraum: "Monat" }, "5.000–5.500 CHF / Monat"],
    [{ min: 25, max: 32.5, waehrung: "EUR", zeitraum: "Stunde" }, "25–32,5 € / Stunde"],
    [{ min: 35, max: 35, waehrung: "CHF", zeitraum: "Stunde" }, "35 CHF / Stunde"],
  ] as const) assert.equal(gehaltText({}, { gehalt }), erwartet);
});

test("gehaltText behält einzelne min-/max-Werte und nicht vollständige manuelle Steckbriefe", () => {
  for (const [gehalt, erwartet] of [
    [{ min: 25, zeitraum: "Stunde" }, "25 € / Stunde"],
    [{ max: 42, min: null, waehrung: "CHF", zeitraum: "Stunde" }, "42 CHF / Stunde"],
    [{ min: NaN, max: 30, zeitraum: "Stunde" }, "30 € / Stunde"],
    [{ min: 60000 }, "60.000 € / Jahr"],
    [{ min: 60000, waehrung: null, zeitraum: null }, "60.000 € / Jahr"],
    [{ min: 50, waehrung: "USD", zeitraum: "Stunde" }, "50 USD / Stunde"],
  ] as const) assert.equal(gehaltText({}, { gehalt }), erwartet);
});

test("gehaltText gibt manuellen Angaben weiter Vorrang vor dem Steckbrief und rechnet Freitext nicht um", () => {
  const steckbrief = { gehalt: { min: 25, max: 30, zeitraum: "Stunde" } };
  assert.equal(gehaltText({ angebot_fix: "  90k + Bonus  ", gehalt_wunsch: "80k", gehalt_spanne_anzeige: "70k" }, steckbrief), "90k + Bonus");
  assert.equal(gehaltText({ angebot_fix: " ", gehalt_wunsch: "  30 €/h  ", gehalt_spanne_anzeige: "70k" }, steckbrief), "30 €/h");
  assert.equal(gehaltText({ angebot_fix: "", gehalt_wunsch: null, gehalt_spanne_anzeige: "  nach Vereinbarung  " }, steckbrief), "nach Vereinbarung");
  assert.equal(gehaltText({ angebot_fix: null, gehalt_wunsch: " ", gehalt_spanne_anzeige: "" }, steckbrief), "25–30 € / Stunde");
});

test("gehaltText erfindet ohne endlichen Betrag keine Gehaltsangabe", () => {
  for (const gehalt of [null, {}, { min: null, max: null }, { min: NaN, max: Infinity, zeitraum: "Stunde" }]) {
    assert.equal(gehaltText({}, { gehalt }), null);
  }
});
