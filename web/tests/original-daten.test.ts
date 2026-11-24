import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { ordneOriginalZu, originalWaehlenMit, keinOriginalMit } from "../lib/original-daten.ts";
import { importiereStelle, pruefeImportDaten } from "../lib/stellen-import.ts";
import { analysiereLink } from "../lib/link-import.ts";
import { istPortal } from "../lib/jobportale.ts";

const owner = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const andereId = "33333333-3333-4333-8333-333333333333";
const portal = "https://www.indeed.de/viewjob?jk=123";
const job = { id: "Beispiel GmbH:1", unternehmen: "Beispiel GmbH", titel: "Controller (m/w/d)", ort: "Bonn",
  url: "https://karriere.example.invalid/1", arbeitsmodell: "Hybrid", text: "Original", abschnitte: { aufgaben: ["Planung"] } };

type Firma = { name: string; ats_typ: string; ats_id: string };
function datenbank(option: {
  jobs?: typeof job[]; firmen?: Firma[]; app?: Record<string, unknown>; dublette?: boolean | string;
  dublettenFeld?: "link" | "portal_link"; dubletteBeimSchreiben?: boolean; konflikt?: boolean; migrationFehlt?: boolean;
} = {}) {
  const app = { id, owner_id: owner, geaendert_am: "2026-11-21T10:00:00+00:00", job_id: null, link: portal, portal_link: portal,
    original_suche: null, original_wahl: null, firma: "Beispiel", titel: "Controller", standort: null, snapshot_text: "Eigener Text", ...option.app };
  const patches: Record<string, unknown>[] = [];
  const pfade: URL[] = [];
  let schreibkonflikt = false;
  const sb = createClient("https://synthetisch.example.invalid", "synthetisch", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const u = new URL(String(input));
      assert.equal(u.origin, "https://synthetisch.example.invalid");
      pfade.push(u);
      const q = u.searchParams;
      const antwort = (data: unknown, status = 200) => Response.json(data, { status });
      if (u.pathname.endsWith("/jobs")) {
        const liste = option.jobs ?? [job];
        assert.equal(q.get("sichtbar"), "eq.true");
        assert.equal(q.get("status"), "eq.offen");
        return antwort(q.has("id") ? liste.filter(j => q.get("id") === `eq.${j.id}`) : liste.slice(Number(q.get("offset") ?? 0), Number(q.get("offset") ?? 0) + Number(q.get("limit") ?? 1000)));
      }
      if (u.pathname.endsWith("/companies")) return antwort(option.firmen ?? []);
      assert.ok(u.pathname.endsWith("/applications"));
      assert.equal(q.get("owner_id"), `eq.${owner}`);
      if (init?.method === "PATCH") {
        assert.equal(q.get("geaendert_am"), `eq.${app.geaendert_am}`);
        assert.equal(q.get("job_id"), "is.null");
        const patch = JSON.parse(String(init?.body));
        patches.push(patch);
        if (option.dubletteBeimSchreiben && !schreibkonflikt && patch.original_suche === "gefunden") {
          schreibkonflikt = true;
          return antwort({ code: "23505" }, 409);
        }
        return antwort(option.konflikt ? [] : [{ id }]);
      }
      if (option.migrationFehlt) return antwort({ code: "42703", message: "Spalte fehlt" }, 400);
      if (q.get("id") === `neq.${id}`) {
        const dupJob = typeof option.dublette === "string" ? `eq.${option.dublette}` : "is.null";
        const linkAbfrage = ["link", "portal_link"].some(feld => q.has(feld));
        const passt = option.dublette && (!option.dubletteBeimSchreiben || schreibkonflikt)
          && (!linkAbfrage || q.has(option.dublettenFeld ?? "link")) && (!q.has("job_id") || q.get("job_id") === dupJob);
        return antwort(passt ? [{ id: andereId }] : []);
      }
      return antwort(app.owner_id === owner ? [app] : []);
    } },
  });
  return { sb, patches, pfade };
}

test("Eindeutiges Original übernimmt Stellenlink und Snapshot und erhält Nutzereingaben", async () => {
  const d = datenbank();
  assert.equal(await ordneOriginalZu(d.sb, id, owner), "gefunden");
  assert.equal(d.patches[0].job_id, job.id);
  assert.equal(d.patches[0].link, job.url);
  assert.equal(d.patches[0].portal_link, portal);
  assert.equal(d.patches[0].snapshot_text, undefined);
  assert.equal(d.patches[0].firma, undefined);
  assert.deepEqual(d.patches[0].snapshot_abschnitte, job.abschnitte);
});

test("Weitere passende Firma auf einer späteren Seite verhindert automatische Übernahme", async () => {
  const jobs = [job, ...Array.from({ length: 499 }, (_, i) => ({ ...job, id: `Zwischenname:${i}`, unternehmen: "Zwischenname" })),
    { ...job, id: "Beispiel Energy:1", unternehmen: "Beispiel Energy" }];
  const d = datenbank({ jobs });
  assert.equal(await ordneOriginalZu(d.sb, id, owner), "auswahl");
  assert.equal(d.patches[0].job_id, undefined);
  assert.deepEqual((d.patches[0].original_vorschlaege as { job_id: string }[]).map(v => v.job_id), [job.id, "Beispiel Energy:1"]);
});

test("Unbekannte Firma bleibt für die Nacht offen und eine fehlende Migration stoppt die Suche", async () => {
  const d = datenbank({ jobs: [] });
  assert.equal(await ordneOriginalZu(d.sb, id, owner), "offen");
  assert.equal(d.patches[0].original_suche, "offen");
  const alt = datenbank({ migrationFehlt: true });
  await ordneOriginalZu(alt.sb, id, owner);
  assert.equal(alt.pfade.length, 1);
  assert.equal(alt.patches.length, 0);
});

test("Eigene Dublette ergibt einen Hinweis ohne Link- oder Statusänderung", async () => {
  const d = datenbank({ dublette: true });
  assert.equal(await ordneOriginalZu(d.sb, id, owner), "nicht_gefunden");
  assert.equal(d.patches[0].original_dublette, andereId);
  for (const feld of ["link", "job_id", "status", "beworben_am"]) assert.equal(d.patches[0][feld], undefined);
  const gleicheStelle = datenbank({ dublette: job.id });
  assert.equal(await ordneOriginalZu(gleicheStelle.sb, id, owner), "nicht_gefunden");
  assert.equal(gleicheStelle.patches[0].original_dublette, andereId);
  const andereStelle = datenbank({ dublette: "Beispiel GmbH:2" });
  assert.equal(await ordneOriginalZu(andereStelle.sb, id, owner), "gefunden");
  assert.equal(andereStelle.patches[0].job_id, job.id);
});

test("Originalzuordnung findet eigene portal_link-Dublette vor oder nach Schreibkonflikt", async () => {
  for (const dubletteBeimSchreiben of [false, true]) {
    const d = datenbank({ dublette: true, dublettenFeld: "portal_link", dubletteBeimSchreiben });
    assert.equal(await ordneOriginalZu(d.sb, id, owner), "nicht_gefunden");
    const patch = d.patches.at(-1)!;
    assert.equal(patch.original_dublette, andereId);
    for (const feld of ["link", "portal_link", "job_id", "status", "beworben_am"]) assert.equal(patch[feld], undefined);
    assert.deepEqual(d.pfade.filter(p => p.searchParams.has("portal_link")).map(p => p.searchParams.get("portal_link")),
      Array(dubletteBeimSchreiben ? 2 : 1).fill(`eq.${job.url}`));
  }
});

test("Verschiedene ausdrückliche Rechtsformen schließen automatische Übernahme aus", async () => {
  const d = datenbank({ app: { firma: "Beispiel AG" } });
  assert.equal(await ordneOriginalZu(d.sb, id, owner), "auswahl");
  assert.equal(d.patches[0].job_id, undefined);
});

test("Co und SE am Namensanfang sind keine Rechtsformendungen für Stellen oder Boards", async () => {
  for (const [firma, unternehmen] of [["Co Pilot", "Pilot"], ["Labs", "SE Labs"]]) {
    const d = datenbank({ app: { firma }, jobs: [{ ...job, unternehmen }] });
    assert.equal(await ordneOriginalZu(d.sb, id, owner), "auswahl", `${firma} / ${unternehmen}`);
    assert.deepEqual(d.patches.map(p => p.job_id), [undefined]);
    const board = datenbank({ app: { firma }, jobs: [], firmen: [{ name: unternehmen, ats_typ: "ashby", ats_id: "example" }] });
    let abrufe = 0;
    assert.equal(await ordneOriginalZu(board.sb, id, owner, { alle: async () => { abrufe++; return []; } }), "offen");
    assert.equal(abrufe, 0);
  }
  const rechtsform = datenbank({ jobs: [{ ...job, unternehmen: "Beispiel GmbH & Co. KG" }] });
  assert.equal(await ordneOriginalZu(rechtsform.sb, id, owner), "gefunden");
});

test("Board-Suche fragt nur ein eindeutig bekanntes Firmenboard ab und behält mehrere gleich betitelte Stellen", async () => {
  const firma = { name: "Beispiel GmbH", ats_typ: "ashby", ats_id: "example" };
  const d = datenbank({ jobs: [], firmen: [firma] });
  const stelle = { extId: "1", titel: "Controller", ort: "Bonn", url: "https://jobs.ashbyhq.com/example/1", text: "Planung" };
  const alle = async (typ: string, id: string) => {
    assert.deepEqual([typ, id], ["ashby", "example"]);
    return [stelle, { ...stelle, extId: "2", ort: "Berlin", url: "https://jobs.ashbyhq.com/example/2" }];
  };
  assert.equal(await ordneOriginalZu(d.sb, id, owner, { alle }), "auswahl");
  assert.equal((d.patches[0].original_vorschlaege as unknown[]).length, 2);
  const z = datenbank({ jobs: [], firmen: [firma, { ...firma, name: "Beispiel AG" }] });
  assert.equal(await ordneOriginalZu(z.sb, id, owner, { alle: async () => assert.fail("Mehrdeutiges Board") }), "offen");
});

test("Auswahl verknüpft lokales Original; externe Auswahl und Ablehnung speichern nur den Suchzustand", async () => {
  const app = { original_suche: "auswahl", original_vorschlaege: [
    { titel: job.titel, ort: job.ort, job_id: job.id },
    { titel: "Analyst", ort: "Berlin", url: "https://jobs.ashbyhq.com/board/job", ats_typ: "ashby", ats_id: "board", ext_id: "job" },
    { titel: "Analyst", ort: "Bonn", url: "https://careers.example.invalid/jobs/analyst", ats_typ: "sitemap",
      ats_id: "https://careers.example.invalid/sitemap.xml#/jobs/", ext_id: "analyst" },
  ] };
  const d = datenbank({ app });
  assert.deepEqual(await originalWaehlenMit(d.sb, id, owner, 0), { fehler: null });
  assert.equal(d.patches[0].job_id, job.id);
  assert.deepEqual(await originalWaehlenMit(d.sb, id, owner, 1), { fehler: null });
  assert.equal(d.patches[1].original_wahl, 1);
  assert.equal(d.patches[1].original_suche, "offen");
  assert.equal(d.patches[1].link, undefined);
  assert.deepEqual(await originalWaehlenMit(d.sb, id, owner, 2), { fehler: null });
  assert.equal(d.patches[2].original_wahl, 2);
  assert.deepEqual(await keinOriginalMit(d.sb, id, owner), { fehler: null });
  assert.equal(d.patches[3].original_suche, "nicht_gefunden");
  assert.equal(d.patches[3].original_vorschlaege, null);
});

test("Externe Vorschläge und Auswahl benötigen wie Python HTTPS am Standardport", async () => {
  const firma = { name: "Beispiel GmbH", ats_typ: "ashby", ats_id: "example" };
  const stelle = { extId: "1", titel: "Controller", ort: "Bonn", url: "https://jobs.ashbyhq.com:443/example/1", text: "Planung" };
  const ungueltig = ["http://jobs.ashbyhq.com/example/2", "https://jobs.ashbyhq.com:8443/example/3",
    "https:/jobs.ashbyhq.com/example/4", "https://jobs.ashbyhq.com/example /5", "https://jobs.ashbyhq.com\\example/6"];
  const board = datenbank({ jobs: [], firmen: [firma] });
  assert.equal(await ordneOriginalZu(board.sb, id, owner, { alle: async () => [
    ...ungueltig.map((url, i) => ({ ...stelle, extId: String(i + 2), url })),
    stelle, { ...stelle, extId: "7", url: "https://jobs.ashbyhq.com/example/7" },
  ] }), "auswahl");
  assert.deepEqual((board.patches[0].original_vorschlaege as { url: string }[]).map(v => v.url), [stelle.url, "https://jobs.ashbyhq.com/example/7"]);
  for (const url of ungueltig) {
    const d = datenbank({ app: { original_suche: "auswahl", original_vorschlaege: [{ titel: stelle.titel, url, ats_typ: "ashby", ats_id: "example", ext_id: "1" }] } });
    assert.ok((await originalWaehlenMit(d.sb, id, owner, 0)).fehler, url);
    assert.equal(d.patches.length, 0);
  }
  const sitemap = datenbank({ app: { original_suche: "auswahl", original_vorschlaege: [
    { titel: stelle.titel, url: stelle.url, ats_typ: "sitemap", ats_id: "https://karriere.example.invalid:8443/sitemap.xml#/jobs/", ext_id: "1" },
    { titel: stelle.titel, url: stelle.url, ats_typ: "ashby", ats_id: "example", ext_id: "1" },
  ] } });
  assert.ok((await originalWaehlenMit(sitemap.sb, id, owner, 0)).fehler);
  assert.deepEqual(await originalWaehlenMit(sitemap.sb, id, owner, 1), { fehler: null });
  assert.deepEqual(sitemap.patches, [{ original_wahl: 1, original_suche: "offen" }]);
});

test("Externe Originale erfordern einen Domainnamen ohne besondere Zeichen in der Adresse des Hosts", async () => {
  const ungueltig = ["https://127.0.0.1/job", "https://127.1/job", "https://0x7f000001/job", "https://192.0.2.4/job",
    "https://[::1]/job", "https://[2001:db8::1]/job", "https://%65xample.invalid/job", "https://@example.invalid/job",
    "https://localhost/job", "https://jobs.localhost./job", "https://karriere.example.invalid/job\u0000",
    "https://karriere.example.invalid/job\u007f", "https://./job", "https://../job",
    "https://career..example.invalid/job", "https://example.invalid../job"];
  const gueltig = "https://karriere.example.invalid.:443/jobs/Daten%20Analyse?teil=%2F";
  const firma = { name: "Beispiel GmbH", ats_typ: "ashby", ats_id: "example" };
  const stelle = { extId: "1", titel: "Controller", ort: "Bonn", url: gueltig, text: "Planung" };
  const board = datenbank({ jobs: [], firmen: [firma] });
  assert.equal(await ordneOriginalZu(board.sb, id, owner, { alle: async () => [
    stelle, ...ungueltig.map((url, i) => ({ ...stelle, extId: String(i + 2), url })),
  ] }), "gefunden");
  assert.equal(board.patches[0].link, gueltig);
  for (const url of ungueltig) {
    const d = datenbank({ app: { original_suche: "auswahl", original_vorschlaege: [
      { titel: stelle.titel, url, ats_typ: "ashby", ats_id: "example", ext_id: "1" },
      { titel: stelle.titel, url: gueltig, ats_typ: "sitemap", ats_id: `${url}#/jobs/`, ext_id: "1" },
    ] } });
    assert.ok((await originalWaehlenMit(d.sb, id, owner, 0)).fehler, url);
    assert.ok((await originalWaehlenMit(d.sb, id, owner, 1)).fehler, url);
    assert.equal(d.patches.length, 0);
  }
});

test("Eigentümer, Auswahlgrenzen, Job-Zugriff und konkurrierende Änderung werden geprüft", async () => {
  const fremd = datenbank({ app: { owner_id: andereId, original_suche: "auswahl" } });
  assert.ok((await originalWaehlenMit(fremd.sb, id, owner, 0)).fehler);
  assert.ok((await keinOriginalMit(fremd.sb, id, owner)).fehler);
  assert.equal(fremd.patches.length, 0);
  const app = { original_suche: "auswahl", original_vorschlaege: [{ titel: job.titel, job_id: job.id }] };
  const d = datenbank({ app, jobs: [] });
  for (const n of [-1, 0, 1, 1.5, NaN]) assert.ok((await originalWaehlenMit(d.sb, id, owner, n)).fehler);
  assert.equal(d.patches.length, 0);
  const konflikt = datenbank({ app, konflikt: true });
  assert.ok((await originalWaehlenMit(konflikt.sb, id, owner, 0)).fehler);
});

test("Import übernimmt vom Portal nur einen eindeutig erkannten Indeed-Tabtitel", () => {
  const r = pruefeImportDaten({ link: portal, titel: "Controller | bei Beispiel | Indeed", firma: "Fremde Firma", text: "Portaltext" });
  assert.ok("daten" in r);
  assert.deepEqual([r.daten.titel, r.daten.firma, r.daten.text], ["Controller", "Beispiel", null]);
  for (const link of ["https://linkedin.com/jobs/view/123", "https://www.stepstone.de/123", "https://www.xing.com/jobs/123"]) {
    assert.ok("fehler" in pruefeImportDaten({ link, titel: "Controller", firma: "Fremd" }));
  }
});

function anlageDb(option: { migrationFehlt?: boolean; vorhanden?: boolean; direkterLink?: boolean } = {}) {
  const calls: { method: string; url: URL; body: Record<string, unknown> | null }[] = [];
  const sb = createClient("https://synthetisch.example.invalid", "synthetisch", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.origin, "https://synthetisch.example.invalid");
      assert.equal(url.pathname, "/rest/v1/applications");
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ method, url, body });
      if (method === "GET" && !url.searchParams.has("portal_link")) return Response.json(option.direkterLink ? [{ id: andereId }] : []);
      if (option.migrationFehlt && (url.searchParams.has("portal_link") || body?.portal_link)) {
        return Response.json({ code: "PGRST204", message: "Spalte fehlt" }, { status: 400 });
      }
      if (method === "GET") return Response.json(option.vorhanden ? [{ id: andereId }] : []);
      assert.equal(method, "POST");
      return Response.json({ id }, { status: 201 });
    } },
  });
  sb.auth.getClaims = (async () => ({ error: null, data: { claims: { sub: owner } } })) as typeof sb.auth.getClaims;
  return { sb, calls };
}

const require = createRequire(import.meta.url);
const ts = require("typescript");
const actionCode = ts.transpileModule(readFileSync(new URL("../app/bewerbungen/actions.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function linkAction(sb: ReturnType<typeof anlageDb>["sb"], nachSuche: () => void) {
  const arbeit: (() => Promise<void>)[] = [];
  const verboten = () => assert.fail("Portal-Link darf keinen Abruf oder alte Verknüpfung auslösen");
  const imports: Record<string, object> = {
    "next/cache": { revalidatePath: () => {} },
    "next/server": { after: (fn: () => Promise<void>) => arbeit.push(fn) },
    "@/lib/supabase/server": { createClient: async () => sb },
    "@/lib/link-import": { analysiereLink },
    "@/lib/bewerbung-anlegen": { aufBeworben: verboten },
    "@/lib/filter": { heuteLokal: () => "2026-11-21" },
    "@/lib/ats-abruf": { holeStelle: verboten, sucheTitel: verboten },
    "@/lib/groq": { erkenneFirmaTitel: verboten },
    "@/lib/jobportale": { istPortal },
    "@/lib/original-daten": { ordneOriginalZu: nachSuche, originalSpalteFehlt: (e: { code: string } | null) => e?.code === "PGRST204" },
    "@/lib/seiten-abruf": { darfAbrufen: verboten },
    "@/lib/jobposting": { zielAusFirmenseite: verboten },
    "@/lib/github-anstoss": { anzeigeLesenAnstossen: verboten },
    "@/lib/bewerbung": {},
    "@/lib/uebernahme": { textZuLang: () => false },
    "@/app/konto/actions": {},
  };
  const exports: { bewerbungAusLink?: (url: string, firma?: string, titel?: string) => Promise<unknown> } = {};
  runInNewContext(actionCode, { exports, URL, require: (name: string) => imports[name] ?? assert.fail(name) });
  return { anlegen: exports.bewerbungAusLink!, arbeit };
}

test("Portal-Link fordert bei jedem fehlenden Pflichtfeld zur Eingabe auf und umgeht auch mit ATS-Parameter alle alten Abrufe", async () => {
  const d = anlageDb();
  let gesucht = 0;
  const a = linkAction(d.sb, () => gesucht++);
  const url = portal + "&gh_jid=123";
  for (const [f, t] of [["", ""], ["Beispiel", ""], ["", "Controller"]]) {
    const r = await a.anlegen(url, f, t);
    assert.deepEqual(JSON.parse(JSON.stringify(r)), { brauchtEingabe: true, grund: "portal_ohne_firma" });
  }
  assert.ok(d.calls.every(c => c.method === "GET"));
  const r = await a.anlegen(url, "Beispiel", "Controller");
  assert.deepEqual(JSON.parse(JSON.stringify(r)), { angelegt: id, portal: true });
  assert.equal(gesucht, 0);
  assert.equal(a.arbeit.length, 1);
  await a.arbeit[0]();
  assert.equal(gesucht, 1);
  assert.equal(d.calls.at(-1)?.body?.portal_link, url);
  assert.equal(d.calls.at(-1)?.body?.status, "beworben");
});

test("Nummerischer LinkedIn-Link zeigt die eigene Bewerbung ohne erneute Eingabe oder Änderungen", async () => {
  const url = "https://www.linkedin.com/jobs/search/?currentJobId=123";
  const normalisiert = "https://www.linkedin.com/jobs/view/123/";
  for (const direkterLink of [true, false]) {
    const d = anlageDb({ vorhanden: true, direkterLink });
    const a = linkAction(d.sb, () => assert.fail("Keine erneute Suche bei eigener Dublette"));
    const r = await a.anlegen(url);
    assert.deepEqual(JSON.parse(JSON.stringify(r)), { angelegt: andereId, vorhanden: true, portal: true });
    assert.deepEqual(d.calls.map(({ method, url }) => [method, url.searchParams.get("owner_id"), url.searchParams.get("link"), url.searchParams.get("portal_link")]),
      [["GET", `eq.${owner}`, `eq.${normalisiert}`, null], ...(!direkterLink ? [["GET", `eq.${owner}`, null, `eq.${normalisiert}`]] : [])]);
    assert.equal(a.arbeit.length, 0);
  }
});

test("Portal-Anlage und Portal-Import finden umgeschriebene Links und bleiben vor Migration 020 nutzbar", async () => {
  const payload = pruefeImportDaten({ link: portal, titel: "Controller | bei Beispiel | Indeed" });
  assert.ok("daten" in payload);
  for (const option of [{ vorhanden: true }, { migrationFehlt: true }]) {
    const d = anlageDb(option);
    const arm = () => assert.fail("Keine Hintergrundsuche für Dublette oder vor Migration.");
    const a = linkAction(d.sb, arm);
    const r = await a.anlegen(portal, "Beispiel", "Controller");
    assert.equal(a.arbeit.length, 0);
    assert.deepEqual(JSON.parse(JSON.stringify(r)), option.vorhanden ? { angelegt: andereId, vorhanden: true, portal: true } : { angelegt: id, portal: true });
    const i = await importiereStelle(d.sb, owner, payload.daten, arm);
    assert.deepEqual(i, { id: option.vorhanden ? andereId : id, vorhanden: !!option.vorhanden });
    const gespeichert = d.calls.filter(c => c.method === "POST");
    assert.equal(gespeichert.length, option.vorhanden ? 0 : 4);
    if (option.migrationFehlt) assert.equal(gespeichert.at(-1)?.body?.status, "gemerkt");
  }
});
