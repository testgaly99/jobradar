import test from "node:test";
import assert from "node:assert/strict";
import { spaltenFehlen, baueKarte } from "../lib/tracker-karte.ts";

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
