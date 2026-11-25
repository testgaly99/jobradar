import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import * as bewerbung from "../lib/bewerbung.ts";
import * as zug from "../lib/zug.ts";
import * as offline from "../lib/offline.ts";
import * as filter from "../lib/filter.ts";
import * as karte from "../lib/tracker-karte.ts";
import { aufBeworben, entmerkenMit } from "../lib/bewerbung-schutz.ts";
import { anlegenAusJob } from "../lib/bewerbung-anlegen.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const lade = (pfad: string) => ts.transpileModule(readFileSync(new URL(pfad, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText as string;
const ausfuehren = (code: string, imports: Record<string, object>) => {
  const exports = {} as Record<string, never>;
  runInNewContext(code, { exports, require: (n: string) => imports[n] ?? assert.fail(n) });
  return exports;
};

const uid = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const jobId = "Prüffirma:7";
type Zeile = Record<string, unknown>;

// Attrappe: applications (GET liefert Zeile mit eingebettetem jobs, PATCH zählt), jobs-Tabelle für beworben().
function db(app: Zeile, jobStatus: string | null) {
  const patches: Zeile[] = [];
  const sb = createClient("https://datenbank.example.invalid", "synthetisch", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      const methode = init?.method ?? "GET";
      if (url.pathname.endsWith("/jobs")) {
        return Response.json([{ id: jobId, url: "https://karriere.example.invalid/7", titel: "Analyst", status: jobStatus }]);
      }
      if (url.pathname.endsWith("/application_events")) return Response.json([]);
      assert.equal(url.pathname, "/rest/v1/applications");
      if (methode === "GET") {
        const z = { ...app, jobs: app.job_id && jobStatus ? { status: jobStatus } : null };
        return Response.json([z]);
      }
      patches.push(JSON.parse(String(init?.body)));
      Object.assign(app, JSON.parse(String(init?.body)));
      return Response.json([{ id }]);
    } },
  });
  sb.auth.getClaims = (async () => ({ data: { claims: { sub: uid } }, error: null })) as typeof sb.auth.getClaims;
  return { sb, patches };
}

const trackerModul = () => ausfuehren(lade("../lib/tracker-daten.ts"), {
  "server-only": {}, "./bewerbung.ts": bewerbung, "./zug.ts": zug, "./filter.ts": filter, "./tracker-karte.ts": karte,
  "./woche.ts": {}, "./auswertung.ts": {},
});

function zugAktionen(sb: unknown) {
  const tracker = trackerModul();
  return ausfuehren(lade("../app/bewerbungen/zug-actions.ts"), {
    "next/cache": { revalidatePath: () => {} },
    "@/lib/supabase/server": { createClient: async () => sb },
    "@/lib/bewerbung": bewerbung, "@/lib/filter": filter, "@/lib/tracker-daten": tracker, "@/lib/zug": zug, "@/lib/offline": offline,
  }) as unknown as { zugAusfuehren: (id: string, von: string, ziel: { status: string }, trotzdem?: boolean) => Promise<{ ok: boolean; fehler?: string }> };
}

const gemerkt = (job_id: string | null) => ({ id, status: "gemerkt", runde: null, ergebnis: null, beworben_am: null, job_id });

test("zugAusfuehren sperrt gemerkt -> beworben bei geschlossener Stelle ohne PATCH", async () => {
  const d = db(gemerkt(jobId), "geschlossen");
  const r = await zugAktionen(d.sb).zugAusfuehren(id, "gemerkt", { status: "beworben" });
  assert.equal(r.ok, false);
  assert.equal(r.fehler, offline.OFFLINE_GESPERRT);
  assert.equal(d.patches.length, 0);
});

test("zugAusfuehren sperrt auch Sprünge über beworben hinaus", async () => {
  const d = db(gemerkt(jobId), "geschlossen");
  assert.equal((await zugAktionen(d.sb).zugAusfuehren(id, "gemerkt", { status: "im_gespraech" })).ok, false);
  assert.equal(d.patches.length, 0);
});

test("zugAusfuehren mit trotzdem trägt beworben ein", async () => {
  const d = db(gemerkt(jobId), "geschlossen");
  assert.equal((await zugAktionen(d.sb).zugAusfuehren(id, "gemerkt", { status: "beworben" }, true)).ok, true);
  assert.equal(d.patches[0].status, "beworben");
});

test("zugAusfuehren: aktive Stelle und Bewerbung ohne job_id sind nie gesperrt", async () => {
  for (const [job_id, st] of [[jobId, "aktiv"], [null, "geschlossen"]] as const) {
    const d = db(gemerkt(job_id), st);
    assert.equal((await zugAktionen(d.sb).zugAusfuehren(id, "gemerkt", { status: "beworben" })).ok, true);
    assert.equal(d.patches[0].status, "beworben");
  }
});

// Seitenformular "Ablauf" und Knopf "Ich habe mich beworben".
function formular(sb: unknown) {
  const tracker = trackerModul();
  return ausfuehren(lade("../app/bewerbungen/detail-actions.ts"), {
    "next/navigation": { notFound: () => { throw new Error("404"); }, redirect: (p: string) => { throw new Error(p); }, RedirectType: { replace: "replace" } },
    "next/cache": { revalidatePath: () => {} },
    "@/lib/supabase/server": { createClient: async () => sb },
    "@/lib/bewerbung": bewerbung, "@/lib/filter": filter, "@/lib/tracker-daten": tracker, "@/lib/zug": zug, "@/lib/offline": offline,
  }) as unknown as { abschnittSpeichern: (id: string, a: string, f: FormData) => Promise<void> };
}
const ablauf = (extra: Record<string, string> = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ status: "beworben", ...extra })) f.set(k, v);
  return f;
};

test("Formular Ablauf sperrt bei geschlossener Stelle, trotzdem=1 erlaubt", async () => {
  const d = db(gemerkt(jobId), "geschlossen");
  await assert.rejects(formular(d.sb).abschnittSpeichern(id, "ablauf", ablauf()), (e: Error) => e.message.includes(encodeURIComponent(offline.OFFLINE_GESPERRT)));
  assert.equal(d.patches.length, 0);
  const d2 = db(gemerkt(jobId), "geschlossen");
  await assert.rejects(formular(d2.sb).abschnittSpeichern(id, "ablauf", ablauf({ trotzdem: "1" })), (e: Error) => !e.message.includes("fehler="));
  assert.equal(d2.patches[0].status, "beworben");
});

function stellen(sb: unknown) {
  const imports: Record<string, object> = {
    "next/navigation": { redirect: (p: string) => { throw new Error(p); } },
    "next/cache": { revalidatePath: () => {} },
    "@/lib/supabase/server": { createClient: async () => sb },
    "@/lib/bewerbung-anlegen": { anlegenAusJob, aufBeworben },
    "@/lib/fehler": { fehlerText: () => "Allgemeiner Fehler" },
    "@/lib/filter": { heuteLokal: () => "2026-11-25" },
    "@/lib/offline": offline, "@/lib/tracker-daten": trackerModul(),
    "@/lib/bewerbung-schutz": { entmerkenMit }, "@/lib/nutzer": {}, "@/lib/supabase/admin": {}, "@/lib/firmendaten-issue": {}, "@/lib/wunschfirmen": {},
  };
  return ausfuehren(lade("../app/stellen/actions.ts"), imports) as unknown as { beworben: (id: string, trotzdem?: boolean) => Promise<void> };
}

test("beworben() sperrt gemerkte Bewerbung mit geschlossener Stelle, trotzdem erlaubt", async () => {
  const app = { ...gemerkt(jobId), owner_id: uid };
  const d = db(app, "geschlossen");
  await assert.rejects(stellen(d.sb).beworben(jobId), (e: Error) => e.message.includes(encodeURIComponent(offline.OFFLINE_GESPERRT)));
  assert.equal(d.patches.length, 0);
});

test("beworben() mit trotzdem=true trägt ein; aktive Stelle ist nie gesperrt", async () => {
  for (const [st, trotzdem] of [["geschlossen", true], ["aktiv", false]] as const) {
    const d = db({ ...gemerkt(jobId), owner_id: uid }, st);
    await assert.rejects(stellen(d.sb).beworben(jobId, trotzdem), { message: `/bewerbung/${id}` });
    assert.equal(d.patches[0].status, "beworben");
  }
});
