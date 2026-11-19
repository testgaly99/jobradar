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
  assert.match(a, /grund: "kein_jobposting"/);
  const k = readFileSync(new URL("../app/bewerbungen/knoepfe.tsx", import.meta.url), "utf8");
  assert.ok(k.includes("Diese Seite enthält keine maschinenlesbare Anzeige. Bitte Firma und Titel eintragen oder den Anzeigentext einfügen."));
});
