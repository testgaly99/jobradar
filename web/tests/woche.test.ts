import test from "node:test";
import assert from "node:assert/strict";
import { wochenListe } from "../lib/woche.ts";

const b = (o: object) => ({ id: "1", firma: "F", status: "beworben", naechster_schritt: null, naechster_schritt_faellig: null, interviews: [], ...o }) as Parameters<typeof wochenListe>[0][number];
const H = "2026-11-11";

test("überfälliger Schritt", () => {
  const l = wochenListe([b({ naechster_schritt: "Nachfassen", naechster_schritt_faellig: "2026-11-09" })], H);
  assert.equal(l.length, 1);
  assert.equal(l[0].ueberfaellig, true);
  assert.equal(l[0].art, "schritt");
});
test("Interview: vergangen raus, Zeit gesetzt", () => {
  const l = wochenListe([b({ interviews: [{ datum: "2026-11-09T10:00", aufgabe: null, aufgabe_frist: null }, { datum: "2026-11-15T10:00", aufgabe: null, aufgabe_frist: null }] })], H);
  assert.equal(l.length, 1);
  assert.equal(l[0].zeit, "10:00");
  assert.equal(l[0].art, "interview");
});
test("Aufgabe nach +7 raus; abgeschlossen raus", () => {
  const i = [{ datum: null, aufgabe: "Case", aufgabe_frist: "2026-11-19" }];
  assert.equal(wochenListe([b({ interviews: i })], H).length, 0);
  assert.equal(wochenListe([b({ status: "abgeschlossen", naechster_schritt: "x", naechster_schritt_faellig: "2026-11-12" })], H).length, 0);
  const ok = wochenListe([b({ interviews: [{ datum: null, aufgabe: "Case", aufgabe_frist: "2026-11-18" }] })], H);
  assert.equal(ok[0].art, "aufgabe");
});
