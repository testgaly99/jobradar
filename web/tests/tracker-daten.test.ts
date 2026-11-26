import test from "node:test";
import assert from "node:assert/strict";
import { spaltenFehlen, baueKarte } from "../lib/tracker-karte.ts";
import * as bewerbung from "../lib/bewerbung.ts";
import * as filter from "../lib/filter.ts";
import * as zug from "../lib/zug.ts";
import * as karteModul from "../lib/tracker-karte.ts";
import { laden, attrappe } from "./attrappe-helfer.ts";

test("spaltenFehlen erkennt fehlende 006-Spalten", () => {
  assert.equal(spaltenFehlen({ code: "42703", message: "column applications.runde does not exist" }), true);
  assert.equal(spaltenFehlen({ code: "PGRST204", message: "Could not find the 'kommentar' column" }), true);
  assert.equal(spaltenFehlen({ code: "23505" }), false);
  assert.equal(spaltenFehlen(null), false);
});

test("baueKarte: leere Bewerbung hat nur Pflichtfelder, keine Platzhalter", () => {
  const k = baueKarte({ id: "a", firma: "X", titel: "Y", status: "gemerkt", erstellt_am: "2026-11-01T10:00:00Z" }, [], [], "2026-11-11");
  assert.equal(k.gehalt, null); assert.equal(k.naechsterTermin, null); assert.equal(k.letzterSchritt, "");
  assert.equal(k.runde, null); assert.equal(k.logo_url, null);
});

test("baueKarte: Verlauf, Termin, Gehalt", () => {
  const k = baueKarte(
    { id: "a", firma: "X", titel: "Y", status: "beworben", erstellt_am: "2026-11-01T10:00:00Z", gehalt_wunsch: "80k", naechster_schritt: "Nachfassen", naechster_schritt_faellig: "2026-11-15", jobs: { companies: { logo_url: "l.png" } } },
    [{ datum: "2026-11-08T10:00:00Z", neuer_status: "beworben" }], [{ datum: null, aufgabe: "Case", aufgabe_frist: "2026-11-13" }], "2026-11-11");
  assert.equal(k.gehalt, "80k"); assert.equal(k.logo_url, "l.png");
  assert.deepEqual(k.naechsterTermin, { datum: "2026-11-13", text: "Case" });
  assert.match(k.letzterSchritt, /^Beworben · vor 3 Tagen$/);
});

test("baueKarte: offlineSeit nur bei geschlossener Stelle, Tag nach zuletzt_gesehen", () => {
  const a = { id: "a", firma: "X", titel: "Y", status: "gemerkt" as const, erstellt_am: "2026-11-01T10:00:00Z" };
  assert.equal(baueKarte({ ...a, jobs: { status: "geschlossen", zuletzt_gesehen: "2026-11-24" } }, [], [], "2026-11-25").offlineSeit, "2026-11-25");
  assert.equal(baueKarte({ ...a, jobs: { status: "aktiv", zuletzt_gesehen: "2026-11-24" } }, [], [], "2026-11-25").offlineSeit, null);
  assert.equal(baueKarte(a, [], [], "2026-11-25").offlineSeit, null);
});

test("baueKarte: merk_stufe wird übernommen, fehlt sie, gilt gemerkt", () => {
  const a = { id: "a", firma: "X", titel: "Y", status: "gemerkt" as const, erstellt_am: "2026-11-01T10:00:00Z" };
  assert.equal(baueKarte({ ...a, merk_stufe: "neu" }, [], [], "2026-11-25").merkStufe, "neu");
  assert.equal(baueKarte({ ...a, merk_stufe: "spaeter" }, [], [], "2026-11-25").merkStufe, "spaeter");
  assert.equal(baueKarte(a, [], [], "2026-11-25").merkStufe, "gemerkt");
});

const tracker = () => laden("../lib/tracker-daten.ts", {
  "server-only": {}, "./bewerbung.ts": bewerbung, "./zug.ts": zug, "./filter.ts": filter, "./tracker-karte.ts": karteModul,
  "./woche.ts": {}, "./auswertung.ts": {},
}) as unknown as { ladeKarten: (sb: unknown, f: unknown) => Promise<{ karten: { merkStufe: string }[]; ohneSpalten: boolean; fehler?: string }> };
const filter0 = { sort: "erstellt_am", dir: "desc", status: [], firma: "", interesse: null, archiv: false };
const fehlt = { code: "42703", message: "column does not exist" };
const zeile = { id: "a", firma: "X", titel: "Y", status: "gemerkt", erstellt_am: "2026-11-01T10:00:00Z" };

test("ladeKarten: bei fehlenden Spalten der Reihe nach VOLL+Stufe, OHNE+Stufe, VOLL, OHNE", async () => {
  const d = attrappe([{ error: fehlt }, { error: fehlt }, { error: fehlt }, { data: [zeile] }]);
  const r = await tracker().ladeKarten(d.sb, filter0);
  assert.equal(d.spalten.length, 4);
  assert.deepEqual(d.spalten.map((s) => [s.includes("runde,kommentar"), s.includes("merk_stufe")]), [[true, true], [false, true], [true, false], [false, false]]);
  assert.equal(r.ohneSpalten, true); // Versuch 4
  assert.equal(r.karten[0].merkStufe, "gemerkt"); // ohne merk_stufe gilt gemerkt
});

test("ladeKarten: ohneSpalten nur bei Versuch 2 und 4, nicht bei 1 und 3", async () => {
  const lauf = async (fehlschlaege: number) => (await tracker().ladeKarten(attrappe([...Array(fehlschlaege).fill({ error: fehlt }), { data: [] }]).sb, filter0)).ohneSpalten;
  assert.deepEqual([await lauf(0), await lauf(1), await lauf(2), await lauf(3)], [false, true, false, true]);
});

test("ladeKarten: anderer Fehler bricht ohne weiteren Versuch ab", async () => {
  const d = attrappe([{ error: { code: "XX000", message: "kaputt" } }]);
  const r = await tracker().ladeKarten(d.sb, filter0);
  assert.equal(d.spalten.length, 1);
  assert.ok(r.fehler);
});
