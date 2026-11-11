import test from "node:test";
import assert from "node:assert/strict";
import { karteAendern, nachSpalten, naechsteSpalte, type Karte } from "../lib/tracker-karte.ts";

const k = (id: string, status: Karte["status"]) => ({ id, status } as Karte);

test("nachSpalten: gruppiert und behält die Reihenfolge", () => {
  const g = nachSpalten([k("a", "beworben"), k("b", "gemerkt"), k("c", "beworben"), k("d", "abgeschlossen")]);
  assert.deepEqual(g.beworben.map((x) => x.id), ["a", "c"]);
  assert.deepEqual(g.gemerkt.map((x) => x.id), ["b"]);
  assert.deepEqual(g.abgeschlossen.map((x) => x.id), ["d"]);
  assert.deepEqual(g.angebot, []);
});

test("karteAendern: setzt Felder und legt die Karte nach vorn", () => {
  const neu = karteAendern([k("a", "gemerkt"), k("b", "gemerkt")], "b", { status: "im_gespraech", runde: 1 });
  assert.deepEqual(neu.map((x) => [x.id, x.status]), [["b", "im_gespraech"], ["a", "gemerkt"]]);
  assert.equal(neu[0].runde, 1);
  const gleich = [k("a", "gemerkt")];
  assert.equal(karteAendern(gleich, "x", { status: "angebot" }), gleich);
});

test("naechsteSpalte: nach Lage sortiert, am Rand null", () => {
  const sp = [{ id: "beworben", left: 300 }, { id: "gemerkt", left: 0 }, { id: "abgeschlossen", left: 900 }];
  assert.equal(naechsteSpalte(sp, "gemerkt", 1), "beworben");
  assert.equal(naechsteSpalte(sp, "beworben", 1), "abgeschlossen");
  assert.equal(naechsteSpalte(sp, "beworben", -1), "gemerkt");
  assert.equal(naechsteSpalte(sp, "gemerkt", -1), null);
  assert.equal(naechsteSpalte(sp, "abgeschlossen", 1), null);
  assert.equal(naechsteSpalte(sp, "fehlt", 1), null);
});
