import test from "node:test";
import assert from "node:assert/strict";
import { kennzahlen } from "../lib/auswertung.ts";

const H = "2026-11-11";
const b = (o: object = {}) => ({ status: "beworben", ergebnis: null, beworben_am: "2026-11-01", erstellt_am: "2026-10-01T00:00:00Z", events: [], ...o }) as Parameters<typeof kennzahlen>[0][number];

test("zuWenig bei 4", () => {
  const k = kennzahlen([b(), b(), b(), b()], H);
  assert.equal(k.zuWenig, true);
  assert.equal(k.gespraechsquote, null);
  assert.equal(k.angebotsquote, null);
});
test("Gesprächsquote 40, 12 Wochen", () => {
  const k = kennzahlen([
    b({ events: [{ datum: "2026-11-05T00:00:00Z", neuer_status: "im_gespraech" }] }),
    b({ status: "im_gespraech" }), b(), b(), b(),
  ], H);
  assert.equal(k.zuWenig, false);
  assert.equal(k.gespraechsquote, 40);
  assert.equal(k.proWoche.length, 12);
  assert.equal(k.proWoche[11].woche, "2026-11-09");
  assert.equal(k.proWoche[10].woche, "2026-11-02");
  assert.equal(k.proWoche.find((w) => w.woche === "2026-10-26")?.anzahl, 5);
});
test("Median 5", () => {
  const k = kennzahlen([
    b({ events: [{ datum: "2026-11-04T10:00:00Z", neuer_status: "eingang_bestaetigt" }] }),
    b({ events: [{ datum: "2026-11-08T10:00:00Z", neuer_status: "im_gespraech" }] }),
  ], H);
  assert.equal(k.antwortzeitMedian, 5);
});
test("Gesprächsquote >= Angebotsquote, Angebotsquote-Wert", () => {
  const k = kennzahlen([b({ status: "abgeschlossen", ergebnis: "zusage" }), b({ status: "angebot" }), b(), b(), b()], H);
  assert.equal(k.angebotsquote, 40);
  assert.equal(k.gespraechsquote, 40);
  assert.ok(k.gespraechsquote! >= k.angebotsquote!);
});
