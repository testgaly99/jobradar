import test from "node:test";
import assert from "node:assert/strict";
import { leseGehalt, leseSteckbrief } from "../lib/stellendaten.ts";
import { leseSteckbrief as bisherigerImport, kurzzeile, type KurzDaten } from "../lib/steckbrief.ts";

const gehalt = { min: 70000, max: 85000, waehrung: "EUR", zeitraum: "Jahr" };

test("Gehaltsgrenzen, Währung und Zeitraum bleiben unverändert", () => {
  for (const waehrung of ["EUR", "CHF"]) for (const zeitraum of ["Jahr", "Monat", "Stunde"]) {
    const roh = { ...gehalt, min: 25.5, max: 30.75, waehrung, zeitraum };
    assert.deepEqual(leseGehalt(roh), roh);
  }
  assert.deepEqual(leseGehalt({ ...gehalt, max: gehalt.min }), { ...gehalt, max: gehalt.min });
});

test("Unvollständige, ungültige oder nicht unterstützte Gehälter ergeben null", () => {
  for (const roh of [null, [], "70000", {},
    { ...gehalt, min: "70000" }, { ...gehalt, min: 0 }, { ...gehalt, min: -1 },
    { ...gehalt, min: NaN }, { ...gehalt, max: Infinity }, { ...gehalt, max: 60000 },
    { ...gehalt, max: undefined }, { ...gehalt, waehrung: "USD" }, { ...gehalt, zeitraum: "Woche" },
  ]) assert.equal(leseGehalt(roh), null, JSON.stringify(roh));
});

test("Geprüftes Gehalt enthält nur bekannte Felder und teilt kein Objekt mit der Eingabe", () => {
  const roh = { ...gehalt, unbekannt: "nicht übernehmen" };
  const gelesen = leseGehalt(roh)!;
  assert.deepEqual(gelesen, gehalt);
  gelesen.min = 1;
  assert.equal(roh.min, 70000);
});

test("Bekannte Erfahrung einschließlich 0 bleibt von unbekannt unterscheidbar", () => {
  for (const wert of [0, 0.5, 3]) assert.equal(leseSteckbrief({ erfahrung_jahre: wert }).erfahrungJahre, wert);
  for (const wert of [null, undefined, "3", -1, NaN, Infinity, true]) {
    assert.equal(leseSteckbrief({ erfahrung_jahre: wert }).erfahrungJahre, null);
  }
});

test("Ein kaputtes Teilfeld verwirft nicht die übrigen gültigen Daten", () => {
  const s = leseSteckbrief({ erfahrung_jahre: 3, gehalt: { ...gehalt, max: -1 },
    sprachen: [null, 2, { sprache: "Deutsch" }, { sprache: "Deutsch", niveau: "B2" }],
    sicherheitsueberpruefung: true });
  assert.equal(s.erfahrungJahre, 3);
  assert.equal(s.gehalt, null);
  assert.deepEqual(s.sprachen, [{ sprache: "Deutsch", niveau: "B2" }]);
  assert.equal(s.sicherheit, true);
});

test("Leere Rückgaben beeinflussen weder eine andere Stelle noch spätere Rückgaben", () => {
  const a = leseSteckbrief(null), b = leseSteckbrief(null);
  a.erfahrungJahre = 99;
  a.sprachen.push({ sprache: "Nur Test", niveau: "Nur Test" });
  assert.equal(b.erfahrungJahre, null);
  assert.deepEqual(b.sprachen, []);
  assert.deepEqual(leseSteckbrief(null).sprachen, []);
  assert.equal(leseSteckbrief(null).erfahrungJahre, null);
});

test("Auch verschachtelte Felder und wiederholte Lesergebnisse sind unabhängig", () => {
  const roh = { gehalt: { ...gehalt }, sprachen: [{ sprache: "Deutsch", niveau: "B2" }] };
  const a = leseSteckbrief(roh), b = leseSteckbrief(roh);
  a.gehalt!.min = 1;
  a.sprachen[0].niveau = "C2";
  assert.equal(roh.gehalt.min, 70000);
  assert.equal(b.gehalt!.min, 70000);
  assert.equal(roh.sprachen[0].niveau, "B2");
  assert.equal(b.sprachen[0].niveau, "B2");
});

test("Nichtobjekte und Arrays werden wie fehlende Daten behandelt", () => {
  const erwartet = { erfahrungJahre: null, gehalt: null, sprachen: [], sicherheit: false };
  for (const roh of [null, undefined, 1, "x", [], ["x"]]) assert.deepEqual(leseSteckbrief(roh), erwartet);
});

test("Bisherige Importe verwenden denselben Datenleser", () => {
  assert.equal(bisherigerImport, leseSteckbrief);
});

test("Anzeige verwendet explizite 0 statt geschätzter Level-Spanne und doppelt sie nicht", () => {
  const daten: KurzDaten = { groesse: null, level: "Junior", modell: null, vertrag: null, ort: null,
    erstmalsGesehen: null, branchen: [], steckbrief: leseSteckbrief({ erfahrung_jahre: 0 }) };
  assert.deepEqual(kurzzeile(daten, ["level", "erfahrung"]).map(e => e.text), ["Junior (ab 0 Jahren)"]);
  assert.deepEqual(kurzzeile(daten, ["erfahrung"]).map(e => e.text), ["ab 0 Jahren Erfahrung"]);
  assert.deepEqual(kurzzeile({ ...daten, steckbrief: leseSteckbrief(null) }, ["level"]).map(e => e.text), ["Junior (0–2 Jahre)"]);
});
