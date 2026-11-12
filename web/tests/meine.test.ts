import test from "node:test";
import assert from "node:assert/strict";
import { vorauswahl, type Karte } from "../lib/tracker-karte.ts";
import { leseTabelle, standardRichtung } from "../lib/bewerbung.ts";

const k = (id: string, datum?: string): Karte => ({
  id, firma: id, titel: null, status: "beworben", ergebnis: null, interesse: null, beworben_am: null, erstellt_am: "2026-11-01",
  runde: null, kommentar: null, logo_url: null, gehalt: null, letzterSchritt: "", naechsterTermin: datum ? { datum, text: "x" } : null,
});

test("vorauswahl: gewünschte id gewinnt, wenn sie in der Liste ist", () => {
  assert.equal(vorauswahl([k("a"), k("b")], "b")?.id, "b");
});
test("vorauswahl: sonst frühester nächster Termin, bei Gleichstand die obere", () => {
  const l = [k("a", "2026-11-20"), k("b", "2026-11-14"), k("c", "2026-11-14")];
  assert.equal(vorauswahl(l, "fremd")?.id, "b");
});
test("vorauswahl: ohne Termine die oberste, leere Liste null", () => {
  assert.equal(vorauswahl([k("a"), k("b")], undefined)?.id, "a");
  assert.equal(vorauswahl([], "a"), null);
});
test("standardRichtung und leseTabelle ohne dir", () => {
  assert.equal(standardRichtung("firma"), "asc");
  assert.equal(standardRichtung("naechster_schritt_faellig"), "asc");
  assert.equal(standardRichtung("geaendert_am"), "desc");
  assert.equal(leseTabelle({ sort: "firma" }).dir, "asc");
  assert.equal(leseTabelle({ sort: "firma", dir: "desc" }).dir, "desc");
});
