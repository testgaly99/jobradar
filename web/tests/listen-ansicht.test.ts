import test from "node:test";
import assert from "node:assert/strict";
import { firmenStellenMit, gruppiere, ladeListenAnsicht } from "../lib/listen-ansicht.ts";
import { ladeRankingZuordnungen, type RankingZuordnung } from "../lib/rankings.ts";
import { leseFilter } from "../lib/filter.ts";

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

test("richtung auf: Rang letzter zuerst, Größe klein zuerst; ohne Rang/Größe bleiben hinten", () => {
  const rang = gruppiere([z("B", "top", 2), z("A", "top", 1), z("C", "top", 3), z("N", "top", null)], stellen(["A", 1], ["B", 1], ["C", 1], ["N", 1]), new Map(), leer, "top", kat, "auf");
  assert.deepEqual(rang[0].kacheln.map((k) => k.firma), ["C", "B", "A", "N"]);
  const g = new Map([["Klein", 0], ["Gross", 3], ["Unbekannt", 99]]);
  const ohne = gruppiere(["Unbekannt", "Klein", "Gross", "Zeta"].map((n) => z(n, "index", null)),
    stellen(...["Unbekannt", "Klein", "Gross", "Zeta"].map((n) => [n, 1] as [string, number])), g, leer, "index", kat, "auf");
  assert.deepEqual(ohne[0].kacheln.map((k) => k.firma), ["Klein", "Gross", "Unbekannt", "Zeta"]);
});

test("firmenStellen: mehr als 100 Treffer geben einen Link auf die gefilterte Liste", async () => {
  const viele = Array.from({ length: 101 }, (_, i) => ({ id: "a:" + i, titel: "T", ort: null, companies: {} }));
  const r = await firmenStellenMit(attrappe({ data: viele, error: null }).sb, { admin: false }, "SAP", "seit=7");
  assert.ok("stellen" in r && r.stellen.length === 100);
  assert.ok("alle" in r && r.alle === "/stellen?firma=SAP&seit=7");
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

// Zählende Attrappe: Tabellen/RPCs werden gezählt, Zählseiten (order("id").range) liefern 1000 Zeilen je Seite bis "gesamt".
function zaehler(o: { gesamt?: number; fehlerSeite?: number } = {}) {
  const n: Record<string, number> = {};
  const mk = (key: string) => {
    n[key] = (n[key] ?? 0) + 1;
    let von = 0;
    const kette: unknown = new Proxy({}, { get: (_t, name: string) => name === "then"
      ? (res: (v: unknown) => void) => {
        if (key === "from:jobs" || key === "rpc:ranking_stellen") {
          if (von === (o.fehlerSeite ?? -1) * 1000) return res({ data: null, error: { code: "x" } });
          const m = Math.max(0, Math.min(1000, (o.gesamt ?? 0) - von));
          return res({ data: Array.from({ length: m }, (_, i) => ({ unternehmen: "F" + ((von + i) % 5), companies: { groesse_rang: 2, logo_url: "https://l/x.png" } })), error: null });
        }
        return res({ data: [], error: null });
      }
      : (...a: unknown[]) => { if (name === "range") von = a[0] as number; return kette; } });
    return kette;
  };
  return { sb: { from: (t: string) => mk("from:" + t), rpc: (r: string) => mk("rpc:" + r) } as never, n };
}

test("ladeListenAnsicht: 2500 Stellen → 3 Zählseiten, keine companies-Abfrage auf dem Tabellenweg", async () => {
  const { sb, n } = zaehler({ gesamt: 2500 });
  const r = await ladeListenAnsicht(sb, leseFilter({}), "alle");
  assert.equal(r.fehler, null);
  assert.equal(n["from:jobs"], 3);
  assert.equal(n["from:companies"], undefined);
});

test("ladeListenAnsicht: Ranglisten-Filter → companies-Abfrage für Logos bleibt", async () => {
  const { sb, n } = zaehler({ gesamt: 10 });
  const r = await ladeListenAnsicht(sb, leseFilter({ liste: ["dax"] }), "alle");
  assert.equal(r.fehler, null);
  assert.equal(n["rpc:ranking_stellen"], 1);
  assert.equal(n["from:companies"], 1);
});

test("ladeRankingZuordnungen: 120 Firmen → eine RPC", async () => {
  const { sb, n } = zaehler();
  const r = await ladeRankingZuordnungen(sb, true, Array.from({ length: 120 }, (_, i) => "F" + i));
  assert.equal(r.fehler, null);
  assert.equal(n["rpc:ranking_zuordnungen"], 1);
});

test("ladeListenAnsicht: Fehler auf Seite 2 → fehler gesetzt, keine Blöcke", async () => {
  const { sb } = zaehler({ gesamt: 2500, fehlerSeite: 1 });
  const r = await ladeListenAnsicht(sb, leseFilter({}), "alle");
  assert.ok(r.fehler);
  assert.deepEqual(r.bloecke, []);
});
