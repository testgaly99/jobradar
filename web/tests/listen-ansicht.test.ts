import test from "node:test";
import assert from "node:assert/strict";
import { firmenStellenMit, gruppiere } from "../lib/listen-ansicht.ts";
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

// Aufzeichnende Attrappe: jede Methode merkt sich Name und Argumente und gibt dieselbe Kette zurück; await liefert das Ergebnis.
function attrappe(ergebnis: { data: unknown; error: unknown } = { data: [], error: null }) {
  const calls: [string, unknown[]][] = [];
  const kette: unknown = new Proxy({}, { get: (_t, name: string) => name === "then"
    ? (res: (v: unknown) => void) => res(ergebnis)
    : (...a: unknown[]) => { calls.push([name, a]); return kette; } });
  return { sb: kette as never, calls };
}

test("firmenStellen ohne Anmeldung: Fehler, keine Abfrage", async () => {
  const { sb, calls } = attrappe();
  const r = await firmenStellenMit(sb, null, "SAP", "");
  assert.ok("fehler" in r);
  assert.equal(calls.length, 0);
});

test("firmenStellen: Filter aus der Adresse und die Firma werden angewendet, ohne Passung neueste zuerst", async () => {
  const { sb, calls } = attrappe({ data: [{ id: "a:1", titel: "T", ort: "München", companies: {} }], error: null });
  const r = await firmenStellenMit(sb, { admin: false }, "SAP", "modell=Remote&seit=7&sort=rangliste");
  assert.deepEqual(r, { stellen: [{ id: "a:1", titel: "T", ort: "München" }] });
  assert.ok(calls.some(([n, a]) => n === "in" && a[0] === "arbeitsmodell" && (a[1] as string[])[0] === "Remote"));
  assert.ok(calls.some(([n, a]) => n === "gte" && a[0] === "erstmals_gesehen"));
  assert.ok(calls.some(([n, a]) => n === "eq" && a[0] === "unternehmen" && a[1] === "SAP"));
  assert.ok(calls.some(([n, a]) => n === "order" && a[0] === "erstmals_gesehen"));
  assert.ok(!calls.some(([n, a]) => n === "order" && a[0] === "passung_sortwert"));
});

test("firmenStellen: ungültige Eingaben und Datenbankfehler ergeben Fehler", async () => {
  assert.ok("fehler" in await firmenStellenMit(attrappe().sb, { admin: false }, "", ""));
  assert.ok("fehler" in await firmenStellenMit(attrappe().sb, { admin: false }, 5, ""));
  assert.ok("fehler" in await firmenStellenMit(attrappe({ data: null, error: { code: "x" } }).sb, { admin: false }, "SAP", ""));
});
