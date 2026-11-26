import test from "node:test";
import assert from "node:assert/strict";
import { zugPatch, rundePatch, rueckgaengigErlaubt, STATUS_RANG, zurueckZuGemerkt } from "../lib/zug.ts";
import * as bewerbung from "../lib/bewerbung.ts";
import * as filter from "../lib/filter.ts";
import * as karteModul from "../lib/tracker-karte.ts";
import * as zugModul from "../lib/zug.ts";
import * as offline from "../lib/offline.ts";
import { laden, attrappe } from "./attrappe-helfer.ts";

const basis = { status: "gemerkt" as const, runde: null, ergebnis: null, beworben_am: null };

test("zugPatch: beworben_am nur wenn leer", () => {
  assert.deepEqual(zugPatch(basis, { status: "beworben" }, "2026-11-11"), { status: "beworben", beworben_am: "2026-11-11" });
  assert.deepEqual(zugPatch({ ...basis, beworben_am: "2026-10-01" }, { status: "beworben" }, "2026-11-11"), { status: "beworben" });
  assert.deepEqual(zugPatch(basis, { status: "gemerkt" }, "2026-11-11"), { status: "gemerkt" });
});

test("zugPatch: Runde 1 beim ersten Gespräch, sonst bleibt sie", () => {
  assert.deepEqual(zugPatch(basis, { status: "im_gespraech" }, "2026-11-11"), { status: "im_gespraech", runde: 1, beworben_am: "2026-11-11" });
  assert.deepEqual(zugPatch({ ...basis, runde: 3 }, { status: "im_gespraech" }, "2026-11-11"), { status: "im_gespraech", beworben_am: "2026-11-11" });
});

test("zugPatch: abgeschlossen verlangt Ergebnis", () => {
  assert.throws(() => zugPatch(basis, { status: "abgeschlossen" }, "2026-11-11"), /ergebnis/);
  assert.throws(() => zugPatch(basis, { status: "abgeschlossen", ergebnis: "quatsch" }, "2026-11-11"), /ergebnis/);
  assert.throws(() => zugPatch(basis, { status: "abgeschlossen", ergebnis: "constructor" }, "2026-11-11"), /ergebnis/);
  assert.deepEqual(zugPatch(basis, { status: "abgeschlossen", ergebnis: "absage" }, "2026-11-11"), { status: "abgeschlossen", ergebnis: "absage", beworben_am: "2026-11-11" });
});

test("zugPatch: Rückweg aus dem Archiv leert das Ergebnis", () => {
  const alt = { status: "abgeschlossen" as const, runde: 2, ergebnis: "absage", beworben_am: "2026-10-01" };
  assert.deepEqual(zugPatch(alt, { status: "im_gespraech" }, "2026-11-11"), { status: "im_gespraech", ergebnis: null });
});

test("rundePatch: 1..4, sonst nichts", () => {
  assert.equal(rundePatch(4, 1), null);
  assert.deepEqual(rundePatch(null, 1), { runde: 1 });
  assert.equal(rundePatch(1, -1), null);
  assert.deepEqual(rundePatch(2, -1), { runde: 1 });
  assert.equal(rundePatch(null, -1), null);
});

test("rueckgaengigErlaubt: jünger als 10 Minuten", () => {
  assert.equal(rueckgaengigErlaubt("2026-11-11T10:00:00Z", new Date("2026-11-11T10:09:59Z")), true);
  assert.equal(rueckgaengigErlaubt("2026-11-11T10:00:00Z", new Date("2026-11-11T10:10:01Z")), false);
  assert.equal(rueckgaengigErlaubt("kein datum", new Date("2026-11-11T10:00:00Z")), false);
});

test("STATUS_RANG", () => {
  assert.equal(STATUS_RANG.gemerkt, 0);
  assert.equal(STATUS_RANG.abgeschlossen, 4);
});

test("zurueckZuGemerkt: nach einer Bewerbung nie zurück auf Gemerkt", () => {
  assert.equal(zurueckZuGemerkt("beworben", "gemerkt"), true);
  assert.equal(zurueckZuGemerkt("abgeschlossen", "gemerkt"), true);
  assert.equal(zurueckZuGemerkt("gemerkt", "gemerkt"), false);
  assert.equal(zurueckZuGemerkt("gemerkt", "beworben"), false);
  assert.equal(zurueckZuGemerkt("angebot", "beworben"), false);
});

const aktionen = (sb: unknown) => laden("../app/bewerbungen/zug-actions.ts", {
  "next/cache": { revalidatePath: () => {} },
  "@/lib/supabase/server": { createClient: async () => ({ ...(sb as object), auth: { getClaims: async () => ({ data: { claims: { sub: "u" } } }) } }) },
  "@/lib/bewerbung": bewerbung, "@/lib/filter": filter, "@/lib/tracker-karte": karteModul, "@/lib/zug": zugModul, "@/lib/offline": offline,
  "@/lib/tracker-daten": { ladeZugZeile: async () => assert.fail("nicht erwartet"), spaltenFehlen: karteModul.spaltenFehlen },
}) as unknown as { merkStufeSetzen: (id: string, stufe: string) => Promise<{ ok: boolean; fehler?: string }> };
const uuid = "22222222-2222-4222-8222-222222222222";

test("merkStufeSetzen: ungültige Stufe wird abgelehnt, ohne die Datenbank anzufassen", async () => {
  const d = attrappe([]);
  assert.deepEqual({ ...await aktionen(d.sb).merkStufeSetzen(uuid, "quatsch") }, { ok: false, fehler: "Ungültige Stufe." });
  assert.equal(d.aufrufe.length, 0);
});

test("merkStufeSetzen: fehlende Spalte meldet Migration 026", async () => {
  const d = attrappe([{ error: { code: "42703", message: "x" } }]);
  assert.deepEqual({ ...await aktionen(d.sb).merkStufeSetzen(uuid, "neu") }, { ok: false, fehler: "Erst Migration 026 ausführen." });
});

test("merkStufeSetzen: keine Zeile getroffen heißt inzwischen geändert", async () => {
  const d = attrappe([{ data: [] }]);
  assert.deepEqual({ ...await aktionen(d.sb).merkStufeSetzen(uuid, "neu") }, { ok: false, fehler: "Die Bewerbung wurde inzwischen geändert." });
});

test("merkStufeSetzen: gültig ändert nur merk_stufe, gefiltert auf id und status gemerkt", async () => {
  const d = attrappe([{ data: [{ id: uuid }] }]);
  assert.deepEqual({ ...await aktionen(d.sb).merkStufeSetzen(uuid, "spaeter") }, { ok: true });
  const gesehen = JSON.parse(JSON.stringify(d.aufrufe.filter(([m]) => m === "update" || m === "eq")));
  assert.deepEqual(gesehen, [["update", [{ merk_stufe: "spaeter" }]], ["eq", ["id", uuid]], ["eq", ["status", "gemerkt"]]]);
});
