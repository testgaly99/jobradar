import { test } from "node:test";
import assert from "node:assert/strict";
import { waehleFelder, STANDARD_FELDER, kurzzeile, modellText, gehaltText, leseSteckbrief, LEERER_STECKBRIEF, type KurzDaten } from "../lib/steckbrief.ts";

test("ohne Zeile gilt der Standard, Sprachen sind aus", () => {
  assert.deepEqual(waehleFelder(null), STANDARD_FELDER);
  assert.deepEqual(waehleFelder(undefined), STANDARD_FELDER);
  assert.ok(!waehleFelder(null).includes("sprachen"));
});

test("Auswahl: feste Reihenfolge, unbekannte Namen und Doppelte fallen weg", () => {
  assert.deepEqual(waehleFelder(["gehalt", "x", "ort", "gehalt", "groesse"]), ["groesse", "ort", "gehalt"]);
  assert.deepEqual(waehleFelder([]), []);
});

test("Gehaltsformat", () => {
  assert.equal(gehaltText({ min: 70000, max: 85000, waehrung: "EUR", zeitraum: "Jahr" }), "70–85k €");
  assert.equal(gehaltText({ min: 90000, max: 110000, waehrung: "CHF", zeitraum: "Jahr" }), "90–110k CHF");
  assert.equal(gehaltText({ min: 6000, max: 6000, waehrung: "EUR", zeitraum: "Monat" }), "6.000 € / Monat");
  assert.equal(gehaltText({ min: 72500, max: 80000, waehrung: "EUR", zeitraum: "Jahr" }), "72.500–80.000 €");
});

const daten: KurzDaten = {
  groesse: "50–249", level: "Senior", modell: "unbekannt", vertrag: null, ort: "Berlin", erstmalsGesehen: "2026-11-07",
  branchen: ["Tech"], steckbrief: leseSteckbrief({ erfahrung_jahre: 5, sprachen: [{ sprache: "Deutsch", niveau: "C1" }],
    gehalt: { min: 70000, max: 85000, waehrung: "EUR", zeitraum: "Jahr" }, sicherheitsueberpruefung: true }),
};

test("Kurzzeile: nur gewählte Felder, fehlende Werte entfallen still", () => {
  const e = kurzzeile(daten, waehleFelder(["gehalt", "modell", "level", "vertrag", "groesse"]));
  assert.deepEqual(e.map((x) => x.text), ["50–249 Mitarbeitende", "Senior (5–8 Jahre)", "70–85k €"]);
  const alle = kurzzeile(daten, waehleFelder(["sicherheit", "sprachen", "erfahrung", "online_seit", "branche"]));
  assert.deepEqual(alle.map((x) => x.text), ["Online seit 07.11.2026", "ab 5 Jahren Erfahrung", "Deutsch C1", "Sicherheitsüberprüfung", "Tech"]);
});

test("Steckbrief aus kaputtem jsonb wird leer statt Absturz", () => {
  assert.deepEqual(leseSteckbrief(null), LEERER_STECKBRIEF);
  assert.deepEqual(leseSteckbrief("x"), LEERER_STECKBRIEF);
  const s = leseSteckbrief({ erfahrung_jahre: "3", sprachen: [1, { sprache: "Deutsch" }], gehalt: { min: 9, max: 1, waehrung: "USD", zeitraum: "Jahr" } });
  assert.deepEqual(s, LEERER_STECKBRIEF);
});

test("Standard enthält Vertrag und Branche", () => {
  assert.ok(STANDARD_FELDER.includes("vertrag") && STANDARD_FELDER.includes("branche"));
});

test("Modell und Remote erscheinen beide, ohne Doppelung", () => {
  assert.equal(modellText("Hybrid", true), "Hybrid, Remote");
  assert.equal(modellText("Remote", true), "Remote");
  assert.equal(modellText("unbekannt", true), "Remote");
  assert.equal(modellText("Hybrid", false), "Hybrid");
  assert.equal(modellText(null, null), null);
});
