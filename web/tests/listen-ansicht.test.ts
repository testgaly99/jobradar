import test from "node:test";
import assert from "node:assert/strict";
import { gruppiere } from "../lib/listen-ansicht.ts";
import type { RankingZuordnung } from "../lib/rankings.ts";

const z = (unternehmen: string, liste_id: string, rang: number | null, name = liste_id.toUpperCase()): RankingZuordnung =>
  ({ unternehmen, liste_id, name, jahr: 2026, rang, quelle_url: "https://beispiel.example/", lizenz: "test" });
const kat = new Map([["dax", "Börsennotiert"], ["mdax", "Börsennotiert"], ["sdax", "Börsennotiert"], ["tecdax", "Börsennotiert"],
  ["top", "Top-Arbeitgeber"], ["index", "Innovation"], ["neu-boerse", "Börsennotiert"]]);
const stellen = (...n: [string, number][]) => new Map(n);
const leer = new Map<string, string>();

test("Liste mit Rang sortiert Kacheln nach Rang", () => {
  const b = gruppiere([z("B", "top", 2), z("A", "top", 1), z("C", "top", 3)], stellen(["A", 1], ["B", 2], ["C", 3]), new Map(), leer, "top", kat);
  assert.deepEqual(b[0].kacheln.map((k) => k.firma), ["A", "B", "C"]);
  assert.equal(b[0].kacheln[1].stellen, 2);
});

test("Liste ohne Rang: größte Firma zuerst, unbekannte Größe zuletzt, dann Name", () => {
  const g = new Map([["Klein", 0], ["Gross", 3], ["Mitte", 2], ["Unbekannt", 99]]);
  const b = gruppiere(["Unbekannt", "Klein", "Mitte", "Gross", "Zeta", "Alpha"].map((n) => z(n, "index", null)),
    stellen(...["Unbekannt", "Klein", "Mitte", "Gross", "Zeta", "Alpha"].map((n) => [n, 1] as [string, number])), g, leer, "index", kat);
  assert.deepEqual(b[0].kacheln.map((k) => k.firma), ["Gross", "Mitte", "Klein", "Alpha", "Unbekannt", "Zeta"]);
});

test("Firma ohne passende Stelle und leere Liste fehlen", () => {
  const b = gruppiere([z("A", "dax", 1), z("B", "dax", 2), z("C", "mdax", 1)], stellen(["A", 1]), new Map(), leer, "alle", kat);
  assert.deepEqual(b.map((x) => x.id), ["dax"]);
  assert.deepEqual(b[0].kacheln.map((k) => k.firma), ["A"]);
});

test("alle: DAX vor MDAX vor SDAX vor TecDAX, Firma in DAX und TecDAX in beiden", () => {
  const zu = [z("X", "tecdax", 5), z("X", "dax", 3), z("Y", "sdax", 1), z("Z", "mdax", 1)];
  const b = gruppiere(zu, stellen(["X", 2], ["Y", 1], ["Z", 1]), new Map(), leer, "alle", kat);
  assert.deepEqual(b.map((x) => x.id), ["dax", "mdax", "sdax", "tecdax"]);
  assert.equal(b[0].kacheln[0].firma, "X");
  assert.equal(b[3].kacheln[0].firma, "X");
});

test("alle: Kategorien in Katalogreihenfolge, unbekannte Liste nach den bekannten, dann Name", () => {
  const zu = [z("A", "index", null), z("A", "neu-boerse", 1, "Neu"), z("A", "dax", 1), z("A", "top", 1)];
  const b = gruppiere(zu, stellen(["A", 1]), new Map(), leer, "alle", kat);
  assert.deepEqual(b.map((x) => x.id), ["top", "dax", "neu-boerse", "index"]);
});

test("einzelne Liste zeigt nur diese", () => {
  const b = gruppiere([z("A", "dax", 1), z("A", "mdax", 1)], stellen(["A", 1]), new Map(), leer, "mdax", kat);
  assert.deepEqual(b.map((x) => x.id), ["mdax"]);
});

test("Logo und Rang landen in der Kachel", () => {
  const b = gruppiere([z("A", "dax", 7)], stellen(["A", 4]), new Map(), new Map([["A", "https://logo.example/a.png"]]), "dax", kat);
  assert.deepEqual(b[0].kacheln[0], { firma: "A", logo: "https://logo.example/a.png", rang: 7, stellen: 4 });
});
