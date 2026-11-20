import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { zielAusFirmenseite } from "../lib/jobposting.ts";

const SEITE = `<script type="application/ld+json">${JSON.stringify({
  "@type": "JobPosting", title: "Controller (m/w/d)", description: "<p>Aufgaben</p>",
  hiringOrganization: { name: "Seiten GmbH" }, jobLocation: { address: { addressLocality: "Hamburg" } },
})}</script>`;
const URL_ = "https://karriere.seiten.example/job/1";

test("Firmenseite mit JobPosting füllt alle Felder", async () => {
  assert.deepEqual(await zielAusFirmenseite(URL_, {}, { holen: async () => SEITE }),
    { firma: "Seiten GmbH", titel: "Controller (m/w/d)", ort: "Hamburg", text: "Aufgaben", abgerufen: true });
});

test("Eingaben des Nutzers gehen vor", async () => {
  const z = await zielAusFirmenseite(URL_, { firma: "Eigene GmbH" }, { holen: async () => SEITE });
  assert.equal(z.firma, "Eigene GmbH");
  assert.equal(z.titel, "Controller (m/w/d)");
});

test("Abruf scheitert: nicht abgerufen, Eingaben unverändert, kein Fehler nach außen", async () => {
  const z = await zielAusFirmenseite(URL_, { titel: "Mein Titel" }, { holen: async () => { throw new Error("404"); } });
  assert.deepEqual(z, { titel: "Mein Titel", abgerufen: false });
});

test("Seite ohne JobPosting: abgerufen, aber ohne Titel", async () => {
  const z = await zielAusFirmenseite(URL_, {}, { holen: async () => "<html>nur Text</html>" });
  assert.equal(z.abgerufen, true);
  assert.equal(z.titel, undefined);
});

test("Migration 012 fügt die drei Spalten idempotent hinzu", () => {
  const sql = readFileSync(new URL("../../supabase/migrations/012_nachruesten.sql", import.meta.url), "utf8");
  for (const s of ["nachruesten boolean not null default false", "snapshot_steckbrief jsonb", "snapshot_ki jsonb"]) {
    assert.match(sql, new RegExp(`add column if not exists ${s}`));
  }
});

test("Schritt 1d: nur ohne Treffer, ohne ATS, nicht für Portale, mit Abrufgrenze und Rückfall ohne Spalte", () => {
  const a = readFileSync(new URL("../app/bewerbungen/actions.ts", import.meta.url), "utf8");
  assert.match(a, /!ziel && !a\.ats && !istPortal\(u\.hostname\) && darfAbrufen\(/);
  assert.match(a, /nachruesten: true/);
  assert.match(a, /PGRST204/);
  // Seite erreicht, aber nichts erkennbar: trotzdem anlegen (Browser-Lauf liest nach), nur ohne Abruf nachfragen
  assert.match(a, /if \(!firma && !titel && !seite\?\.abgerufen\) return \{ brauchtEingabe: true \};/);
});

test("Nachgerüstete Snapshots im Format des Nachtlaufs werden gelesen", async () => {
  const { leseKi } = await import("../lib/zusammenfassung.ts");
  const { kurzzeile, leseSteckbrief } = await import("../lib/steckbrief.ts");
  // so speichert scraper/nachruesten.py snapshot_ki (ohne studium/taetigkeit) und snapshot_steckbrief
  const ki = { aufgaben: ["Abschluss", "Reporting", "Planung"], rahmen: ["Hybrid"], abschluss: null, erfahrung: "3 Jahre",
    muss: ["SAP"], benefits: [], sprache: "de" };
  assert.deepEqual(leseKi(ki)?.aufgaben, ki.aufgaben);
  assert.equal(leseKi(null), null);
  const sb = leseSteckbrief({ erfahrung_jahre: 3, sprachen: [{ sprache: "Deutsch", niveau: "C1" }], gehalt: null, sicherheitsueberpruefung: false });
  const e = kurzzeile({ groesse: null, level: null, modell: null, vertrag: null, ort: null, erstmalsGesehen: null, branchen: [], steckbrief: sb },
    ["erfahrung", "gehalt", "sprachen", "sicherheit"]);
  assert.deepEqual(e.map((x) => x.text), ["ab 3 Jahren Erfahrung", "Deutsch C1"]);
});

test("Ohne JobPosting: Titel aus og:title als Rückfall, ohne Text und ohne Nachrüsten", async () => {
  const seite = `<head><meta property="og:title" content="Manufacture Digitalization Intern &#35;2"><title>X | Careers - Siemens</title></head>`;
  assert.deepEqual(await zielAusFirmenseite(URL_, {}, { holen: async () => seite }), { titel: "Manufacture Digitalization Intern #2", abgerufen: true });
  const umgedreht = `<meta content="Controller (m/w/d)" property="og:title">`;
  assert.equal((await zielAusFirmenseite(URL_, {}, { holen: async () => umgedreht })).titel, "Controller (m/w/d)");
  assert.equal((await zielAusFirmenseite(URL_, { titel: "Mein Titel" }, { holen: async () => seite })).titel, "Mein Titel");
  const a = readFileSync(new URL("../app/bewerbungen/actions.ts", import.meta.url), "utf8");
});
