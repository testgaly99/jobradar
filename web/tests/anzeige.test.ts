import { test } from "node:test";
import assert from "node:assert/strict";
import { markiere, zaehleTreffer, leseAbschnitte } from "../lib/anzeige.ts";

const treffer = (t: string, b: string[]) => markiere(t, b).filter((s) => s.treffer).map((s) => s.text);

test("Treffer am Anfang, in der Mitte und am Ende", () => {
  assert.deepEqual(markiere("Python und SQL und Excel", ["python", "excel"]), [
    { text: "Python", treffer: true }, { text: " und SQL und ", treffer: false }, { text: "Excel", treffer: true },
  ]);
  assert.deepEqual(treffer("Wir nutzen SQL täglich", ["SQL"]), ["SQL"]);
});
test("Wortanfang und Ende: Python-Kenntnisse ja, JavaScript nicht für Java", () => {
  assert.deepEqual(treffer("Python-Kenntnisse", ["Python"]), ["Python"]);
  assert.deepEqual(treffer("JavaScript und Java", ["Java"]), ["Java"]);
  assert.deepEqual(treffer("Datenbank", ["bank"]), []);
});
test("Umlaute zählen als Buchstaben", () => {
  assert.deepEqual(treffer("Kein Ärger", ["ärger"]), ["Ärger"]);
  assert.deepEqual(treffer("Ärger", ["ger"]), []);
  assert.deepEqual(treffer("Büro", ["Üro"]), []);
});
test("mehrere Begriffe, längster zuerst", () => {
  assert.deepEqual(treffer("Power BI und Power Query", ["Power", "Power BI"]), ["Power BI", "Power"]);
});
test("Sonderzeichen im Begriff", () => {
  assert.deepEqual(treffer("Erfahrung mit C++ (gern) und C", ["C++", "(gern)"]), ["C++", "(gern)"]);
  assert.deepEqual(treffer("a(b", ["("]), []);
  assert.deepEqual(treffer("C", ["C++"]), []);
});
test("leere Begriffsliste und leerer Text", () => {
  assert.deepEqual(markiere("Text", []), [{ text: "Text", treffer: false }]);
  assert.deepEqual(markiere("Text", ["", "  "]), [{ text: "Text", treffer: false }]);
  assert.deepEqual(markiere("", ["a"]), []);
});
test("zaehleTreffer zählt Begriffe, nicht Vorkommen", () => {
  assert.equal(zaehleTreffer("SQL, SQL und Python", ["sql", "Python", "Rust"]), 2);
  assert.equal(zaehleTreffer("x", []), 0);
});
test("leseAbschnitte prüft die Form", () => {
  assert.deepEqual(leseAbschnitte([{ titel: "A", punkte: ["x", "", 3] }, { titel: "B", punkte: [] }, null, "s"]), [{ titel: "A", punkte: ["x"] }]);
  assert.equal(leseAbschnitte(null), null);
  assert.equal(leseAbschnitte({}), null);
});
