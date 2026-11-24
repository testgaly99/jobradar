import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { createClient } from "@supabase/supabase-js";
import { ERWEITERUNG_GESPERRT, PORTALE, istPortal, pruefeImportDaten, importiereStelle, bearbeiteImportAnfrage } from "../lib/stellen-import.ts";
import { erweiterungGesperrt } from "../lib/jobportale.ts";

const OWNER = "11111111-1111-4111-8111-111111111111";
const ID = "22222222-2222-4222-8222-222222222222";
const LINK = "https://jobs.example.invalid/rolle/123";
const APP = "http://localhost:3002";

function datenbank(optionen: { lese?: unknown; lesefehler?: boolean; schreibfehler?: boolean; schreibdaten?: unknown; claims?: unknown; authfehler?: boolean } = {}) {
  const calls: { method: string; url: URL; body: Record<string, unknown> | null }[] = [];
  let authCalls = 0;
  const sb = createClient("https://synthetisch.example.invalid", "synthetisch", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      assert.equal(url.origin, "https://synthetisch.example.invalid");
      assert.equal(url.pathname, "/rest/v1/applications");
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ method, url, body });
      const antwort = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
      if (method === "GET") return optionen.lesefehler ? antwort({ code: "XX000", message: "INTERNE-DETAILS" }, 500) : antwort(optionen.lese ?? []);
      assert.equal(method, "POST", "Der Import darf weder bestehende Inhalte ändern noch löschen");
      return optionen.schreibfehler ? antwort({ code: "XX000", message: "INTERNE-DETAILS" }, 500) : antwort(optionen.schreibdaten ?? { id: ID }, 201);
    } },
  });
  sb.auth.getClaims = (async () => {
    authCalls++;
    return { data: { claims: optionen.claims === undefined ? { sub: OWNER } : optionen.claims }, error: optionen.authfehler ? new Error("INTERNES-AUTH-DETAIL") : null };
  }) as typeof sb.auth.getClaims;
  return { sb, calls, get authCalls() { return authCalls; } };
}

function eingabe(payload: unknown = { link: LINK }) {
  const r = pruefeImportDaten(payload);
  assert.ok("daten" in r);
  return r.daten;
}

function anfrage(body: string = JSON.stringify({ link: LINK }), headers: Record<string, string> = {}) {
  return new Request(`${APP}/api/stellen-import`, { method: "POST", headers: { origin: APP, "content-type": "application/json", ...headers }, body });
}

test("Importdaten normalisieren Link und Klartext ohne Abruf", () => {
  const d = eingabe({ link: " https://jobs.example.invalid/a?x=1 ", titel: " Datenanalyse ", firma: " Beispielbetrieb ", text: "Zeile 1\r\nZeile 2" });
  assert.equal(d.titel, "Datenanalyse");
  assert.equal(d.firma, "Beispielbetrieb");
  assert.equal(d.text, "Zeile 1\nZeile 2");
});

test("Indeed-Link: Text und übermittelte Firma werden verworfen, der Tab-Titel liefert Firma und Stelle", () => {
  const d = eingabe({ link: " https://www.indeed.de/viewjob?jk=123 ", titel: " Datenanalyse | bei Beispiel | Indeed ", firma: " Fremdbetrieb ", text: "Anzeigentext" });
  assert.equal(d.link, "https://www.indeed.de/viewjob?jk=123");
  assert.equal(d.quelle, "indeed.de");
  assert.equal(d.titel, "Datenanalyse");
  assert.equal(d.firma, "Beispiel");
  assert.equal(d.text, null);
  assert.ok("fehler" in pruefeImportDaten({ link: d.link, titel: "Jobsuche | Indeed", firma: "Beispiel" }));
  const evil = eingabe({ link: "https://evil-linkedin.com/jobs/1", firma: "F", text: "T" });
  assert.deepEqual([evil.firma, evil.text], ["F", "T"]);
});

test("Glassdoor, Monster und kununu bleiben mit Adresse und Tabtitel speicherbar", async () => {
  for (const link of ["https://de.glassdoor.com/job/123", "https://www.monster.de/job/123", "https://jobs.kununu.com/stellen/123"]) {
    const daten = eingabe({ link, titel: "Datenanalyse | Stellenportal", firma: "Fremdbetrieb", text: "Portaltext" });
    assert.deepEqual([daten.link, daten.titel, daten.firma, daten.text], [link, "Datenanalyse | Stellenportal", null, null]);
    const d = datenbank();
    assert.deepEqual(await importiereStelle(d.sb, OWNER, daten, () => assert.fail("Ohne Firma startet keine Originalsuche")), { id: ID, vorhanden: false });
    const gespeichert = d.calls.at(-1)?.body;
    assert.deepEqual([gespeichert?.link, gespeichert?.titel, gespeichert?.firma, gespeichert?.snapshot_text, gespeichert?.status],
      [link, daten.titel, null, null, "gemerkt"]);
    assert.ok(!Object.hasOwn(gespeichert ?? {}, "original_suche"));
  }
});

test("Normale Nichtportal-Importe behalten ihr URL-Schema", () => {
  for (const link of ["http://karriere.example.invalid/1", "https://karriere.example.invalid:8443/2", "https://192.0.2.4/job"]) {
    assert.equal(eingabe({ link }).link, link);
  }
});

test("Portalliste in Website und Erweiterung ist identisch", async () => {
  const kern = await import("../../browser-erweiterung/chrome/kern.mjs");
  assert.deepEqual([...PORTALE].sort(), [...kern.PORTALE].sort());
  assert.deepEqual([...ERWEITERUNG_GESPERRT].sort(), [...kern.GESPERRT].sort());
  for (const h of ["www.indeed.co.uk", "x.xing.com", "linkedin.de", "www.lnkd.in.", "lnkd.in.evil.example"]) {
    assert.equal(istPortal(h), kern.istPortal(h), h);
    assert.equal(erweiterungGesperrt(h), kern.istGesperrt(h), h);
  }
});

test("Importdaten weisen kaputte Formen, unzulässige Felder, Credentials und zu lange Werte zurück", () => {
  for (const payload of [null, [], "x", {}, { link: 12 }, { link: "" }, { link: "javascript:alert(1)" }, { link: "file:///tmp/x" },
    { link: "https://name:pass@jobs.example.invalid/a" }, { link: "https://jobs.example.invalid/\nrolle" }, { link: LINK, owner_id: OWNER },
    { link: LINK, status: "beworben" }, { link: LINK, beworben_am: "2026-11-16" }, { link: LINK, titel: 42 }, { link: LINK, firma: null },
    { link: LINK, titel: "a".repeat(501) }, { link: LINK, firma: "a".repeat(301) }, { link: LINK, text: "a".repeat(50_001) },
    { link: `https://jobs.example.invalid/${"a".repeat(4096)}` }, { link: LINK, text: "a\0b" }]) {
    assert.ok("fehler" in pruefeImportDaten(payload), JSON.stringify(payload)?.slice(0, 100));
  }
});

test("Neuer Import ist nutzereigen, Gemerkt und ohne Bewerbungsdatum", async () => {
  const d = datenbank();
  assert.deepEqual(await importiereStelle(d.sb, OWNER, eingabe({ link: LINK, titel: "Analyst", firma: "Beispiel", text: "<b>Klartext</b>" })), { id: ID, vorhanden: false });
  assert.equal(d.calls.length, 2);
  assert.equal(d.calls[0].url.searchParams.get("owner_id"), `eq.${OWNER}`);
  assert.equal(d.calls[0].url.searchParams.get("link"), `eq.${LINK}`);
  assert.deepEqual(d.calls[1].body, { owner_id: OWNER, link: LINK, titel: "Analyst", firma: "Beispiel", quelle: "jobs.example.invalid", snapshot_text: "<b>Klartext</b>", status: "gemerkt", beworben_am: null });
});

test("Fehlende optionale Inhalte bleiben null statt erfundener Angaben", async () => {
  const d = datenbank();
  await importiereStelle(d.sb, OWNER, eingabe());
  assert.equal(d.calls[1].body?.titel, null);
  assert.equal(d.calls[1].body?.firma, null);
  assert.equal(d.calls[1].body?.snapshot_text, null);
});

test("Vorhandener normalisierter Link erhält fortgeschrittenen Status, Datum und Inhalte", async () => {
  const d = datenbank({ lese: [{ id: ID, status: "im_gespraech", beworben_am: "2026-11-01", snapshot_text: "Bestehender Text" }] });
  const r = await importiereStelle(d.sb, OWNER, eingabe({ link: LINK, text: "Neuer Text" }));
  assert.deepEqual(r, { id: ID, vorhanden: true });
  assert.equal(d.calls.length, 1);
  assert.equal(d.calls[0].method, "GET");
});

test("Lesefehler oder beschädigte Dublettenantwort dürfen keinen neuen Eintrag erzeugen", async () => {
  for (const optionen of [{ lesefehler: true }, { lese: {} }, { lese: [{ id: "ungueltig" }] }]) {
    const d = datenbank(optionen);
    assert.ok("fehler" in await importiereStelle(d.sb, OWNER, eingabe()));
    assert.equal(d.calls.length, 1);
    assert.equal(d.calls[0].method, "GET");
  }
});

test("Schreibfehler oder beschädigte neue ID ergeben keinen Erfolg und keine internen Details", async () => {
  for (const optionen of [{ schreibfehler: true }, { schreibdaten: {} }, { schreibdaten: { id: "../../fremd" } }]) {
    const d = datenbank(optionen);
    const r = await importiereStelle(d.sb, OWNER, eingabe());
    assert.ok("fehler" in r);
    assert.ok(!JSON.stringify(r).includes("INTERNE"));
  }
});

test("Gleichzeitige identische Importe im selben Prozess teilen den Schreibvorgang", async () => {
  const d = datenbank();
  const [a, b] = await Promise.all([importiereStelle(d.sb, OWNER, eingabe()), importiereStelle(d.sb, OWNER, eingabe())]);
  assert.deepEqual(a, { id: ID, vorhanden: false });
  assert.deepEqual(b, { id: ID, vorhanden: true });
  assert.equal(d.calls.filter(c => c.method === "POST").length, 1);
});

test("HTTP-Import sperrt fremden oder fehlenden Origin vor Authentifizierung und Datenbank", async () => {
  for (const origin of ["", "null", "https://fremd.example.invalid", "http://localhost:3003", `${APP}.evil.invalid`]) {
    let clients = 0;
    const d = datenbank();
    const r = await bearbeiteImportAnfrage(anfrage(undefined, { origin }), async () => { clients++; return d.sb; });
    assert.equal(r.status, 403);
    assert.equal(clients, 0);
    assert.equal(d.calls.length, 0);
  }
});

test("HTTP-Import fordert JSON und verwirft kaputte oder zu große Nutzlast vor Datenbankzugriff", async () => {
  for (const request of [anfrage(undefined, { "content-type": "text/plain" }), anfrage("{"), anfrage("null"), anfrage(JSON.stringify({ link: LINK, owner_id: OWNER })), anfrage(`{"link":"${LINK}","text":"${"a".repeat(200_001)}"}`)]) {
    const d = datenbank();
    const r = await bearbeiteImportAnfrage(request, async () => d.sb);
    assert.ok([400, 413, 415].includes(r.status));
    assert.equal(d.calls.length, 0);
    assert.equal(d.authCalls, 0);
  }
});

test("HTTP-Import verlangt geprüfte Claims mit gültiger Nutzer-ID vor allen DB-Aufrufen", async () => {
  for (const optionen of [{ claims: null }, { claims: {} }, { claims: { sub: "fremd" } }, { authfehler: true }]) {
    const d = datenbank(optionen);
    const r = await bearbeiteImportAnfrage(anfrage(), async () => d.sb);
    assert.equal(r.status, 401);
    assert.equal(d.authCalls, 1);
    assert.equal(d.calls.length, 0);
  }
});

test("HTTP-Import liefert nur Erfolg-ID und Dublettenstatus als nicht cachebares JSON", async () => {
  for (const vorhanden of [false, true]) {
    const d = datenbank(vorhanden ? { lese: [{ id: ID }] } : {});
    const r = await bearbeiteImportAnfrage(anfrage(undefined, { "content-type": "application/json; charset=utf-8" }), async () => d.sb);
    assert.equal(r.status, vorhanden ? 200 : 201);
    assert.deepEqual(await r.json(), { id: ID, vorhanden });
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.equal(r.headers.get("access-control-allow-origin"), null);
  }
});

const require = createRequire(import.meta.url);
const ts = require("typescript");

function ladeTs(pfad: string, requireErsatz: (id: string) => unknown, extra: Record<string, unknown> = {}) {
  const modul = { exports: {} as Record<string, (...args: any[]) => any> };
  const code = ts.transpileModule(readFileSync(new URL(pfad, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, { module: modul, exports: modul.exports, require: requireErsatz, URL, Response, process: { env: {} }, ...extra });
  return modul.exports;
}

test("Tatsächliche POST-Route verwendet denselben geprüften Ablauf", async () => {
  const d = datenbank();
  const route = ladeTs("../app/api/stellen-import/route.ts", id => {
    if (id === "@/lib/supabase/server") return { createClient: async () => d.sb };
    if (id === "@/lib/stellen-import") return { bearbeiteImportAnfrage };
    if (id === "next/server") return { after: () => assert.fail("Ohne Portal startet keine Originalsuche.") };
    throw new Error(`Unvorbereiteter Import ${id}`);
  });
  const r = await route.POST(anfrage());
  assert.equal(r.status, 201);
  assert.deepEqual(await r.json(), { id: ID, vorhanden: false });
  assert.equal(route.GET, undefined, "GET darf keinen Import auslösen");
});

test("Proxy lässt nur die exakte Import-API selbst mit JSON authentifizieren; andere private Pfade bleiben geschützt", async () => {
  const cookies = { getAll: () => [], set: () => {} };
  const next = () => ({ art: "next", cookies });
  const proxy = ladeTs("../proxy.ts", id => {
    if (id === "@supabase/ssr") return { createServerClient: () => ({ auth: { getClaims: async () => ({ data: null }) } }) };
    if (id === "next/server") return { NextResponse: { next, redirect: (url: URL) => ({ art: "redirect", url, cookies }) } };
    if (id === "@/lib/oeffentlich") return { istOeffentlich: () => false };
    throw new Error(`Unvorbereiteter Proxyimport ${id}`);
  });
  for (const [pfad, erwartet] of [["/api/stellen-import", "next"], ["/api/stellen-import/extra", "redirect"], ["/api/stellen-import-fremd", "redirect"], ["/bewerbungen/import", "redirect"], ["/konto", "redirect"]]) {
    const url = new URL(pfad, APP) as URL & { clone: () => URL };
    url.clone = () => new URL(url);
    const r = await proxy.proxy({ cookies, nextUrl: url });
    assert.equal(r.art, erwartet, pfad);
  }
});
