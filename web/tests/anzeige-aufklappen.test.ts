import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const lade = (pfad: string) => ts.transpileModule(readFileSync(new URL(pfad, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText as string;

const jobId = "Prüffirma:7";
type Ergebnis = { abschnitte: unknown; text: string | null; begriffe: string[]; spalten: unknown[]; geschaetzt: boolean } | { fehler: string };

// Attrappe: jobs liefert eine Zeile, wichtige_punkte zwei Begriffe; zählt die Abfragen.
function modul(nutzer: object | null, abgleich: object | null = { zustand: "fertig", spalten: ["S1"] }, kaputt: "abschnitte" | "anforderungsliste" | null = null) {
  const abfragen: string[] = [];
  const sb = { from: (t: string) => {
    abfragen.push(t);
    const antwort = t === "jobs"
      ? { data: { abschnitte: [{ titel: "Anforderungen", punkte: ["SQL"] }], text: "Volltext", anforderungsliste: [], anforderungs_hash: "h" }, error: null }
      : { data: [{ begriff: "SQL" }, { begriff: "Excel" }], error: null };
    let spalten = "";
    const k: Record<string, unknown> = { select: (c: string) => { spalten = c; return k; }, eq: () => k, maybeSingle: async () => (kaputt && spalten.startsWith(kaputt) ? { data: null, error: { code: "42703" } } : t === "jobs" && spalten.startsWith("anforderungsliste") ? { data: { anforderungsliste: [], anforderungs_hash: "h" }, error: null } : antwort), then: (r: (x: unknown) => unknown) => r(antwort) };
    return k;
  } };
  const exports = {} as Record<string, unknown>;
  const imports: Record<string, object> = {
    "next/navigation": {}, "next/cache": {},
    "@/lib/supabase/server": { createClient: async () => sb },
    "@/lib/nutzer": { aktuellerNutzer: async () => nutzer },
    "@/lib/filter": { ID_FORM: /^[^:]{1,100}:\S{1,200}$/ },
    "@/lib/anzeige": { leseAbschnitte: (x: unknown) => x },
    "../cv-abgleich": { ladeAbgleich: async () => abgleich },
  };
  runInNewContext(lade("../app/stellen/actions.ts"), {
    exports, require: (n: string) => imports[n] ?? new Proxy({}, { get: () => () => {} }),
  });
  return { anzeigeLaden: exports.anzeigeLaden as (id: string) => Promise<Ergebnis>, abfragen };
}

test("anzeigeLaden: Gast bekommt Fehler und keine Abfrage", async () => {
  const m = modul(null);
  assert.ok("fehler" in await m.anzeigeLaden(jobId));
  assert.equal(m.abfragen.length, 0);
});

test("anzeigeLaden: ungültige ID ergibt Fehler ohne Abfrage", async () => {
  const m = modul({ id: "u", admin: false });
  assert.ok("fehler" in await m.anzeigeLaden("ohne-doppelpunkt"));
  assert.equal(m.abfragen.length, 0);
});

test("anzeigeLaden: reicht Abschnitte, Begriffe und Spalten durch", async () => {
  const r = await modul({ id: "u", admin: false }).anzeigeLaden(jobId);
  assert.deepEqual(JSON.parse(JSON.stringify(r)), { abschnitte: [{ titel: "Anforderungen", punkte: ["SQL"] }], text: "Volltext", begriffe: ["SQL", "Excel"], spalten: ["S1"], geschaetzt: false });
});

test("anzeigeLaden: ohne fertigen Abgleich keine Spalten", async () => {
  const r = await modul({ id: "u", admin: false }, { zustand: "offen" }).anzeigeLaden(jobId);
  assert.deepEqual(JSON.parse(JSON.stringify((r as { spalten: unknown[] }).spalten)), []);
});

test("anzeigeLaden: fehlende Migration 018 (zweite Abfrage scheitert) liefert Anzeige ohne Spalten", async () => {
  const r = await modul({ id: "u", admin: false }, undefined, "anforderungsliste").anzeigeLaden(jobId);
  assert.deepEqual(JSON.parse(JSON.stringify(r)), { abschnitte: [{ titel: "Anforderungen", punkte: ["SQL"] }], text: "Volltext", begriffe: ["SQL", "Excel"], spalten: [], geschaetzt: false });
});

test("anzeigeLaden: scheiternde Anzeigen-Abfrage ergibt Fehler", async () => {
  assert.ok("fehler" in await modul({ id: "u", admin: false }, undefined, "abschnitte").anzeigeLaden(jobId));
});

test("anzeigeLaden: Nachtschätzung (weg = schaetzung) setzt geschaetzt", async () => {
  const r = await modul({ id: "u", admin: false }, { zustand: "fertig", spalten: ["S1"], geschaetzt: true }).anzeigeLaden(jobId);
  assert.equal((r as { geschaetzt: boolean }).geschaetzt, true);
});
