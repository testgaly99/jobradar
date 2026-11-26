import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { aufBeworben, entmerkenMit } from "../lib/bewerbung-schutz.ts";
import { anlegenAusJob } from "../lib/bewerbung-anlegen.ts";
import * as offline from "../lib/offline.ts";

function datenbank(optionen: {
  app?: Record<string, unknown> | null; lesefehler?: boolean; loeschfehler?: boolean; schreibfehler?: boolean;
  verschwindetVorUpdate?: boolean;
  counts?: Record<string, number | null | "fehler">;
  vorUpdate?: (a: Record<string, unknown>) => void;
} = {}) {
  let app = optionen.app === undefined ? { id: "test-bewerbung", status: "gemerkt", beworben_am: null } : optionen.app;
  const calls: { method: string; url: URL; body: Record<string, unknown> | null }[] = [];
  const sb = createClient("https://datenbank.example.invalid", "synthetisch", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ method, url, body });
      const antwort = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
      if (method === "HEAD") {
        const count = optionen.counts?.[url.pathname.split("/").at(-1)!] ?? (Object.hasOwn(optionen.counts ?? {}, url.pathname.split("/").at(-1)!) ? null : 0);
        if (count === "fehler") return new Response(null, { status: 500 });
        return new Response(null, { headers: count === null ? {} : { "content-range": `*/${count}` } });
      }
      if (method === "GET") return optionen.lesefehler ? antwort({ code: "XX000" }, 500) : antwort(app ? [{ ...app }] : []);
      if (method === "DELETE") {
        if (optionen.loeschfehler) return antwort({ code: "XX000" }, 500);
        app = null;
        return antwort(null);
      }
      if (method === "PATCH") {
        if (optionen.schreibfehler) return antwort({ code: "XX000" }, 500);
        if (app) optionen.vorUpdate?.(app);
        if (optionen.verschwindetVorUpdate) app = null;
        const passt = app && [...url.searchParams].every(([key, value]) => key === "select"
          || (value === "is.null" ? app![key] === null : value === `eq.${app![key]}`));
        if (!passt) return antwort([]);
        Object.assign(app!, body);
        return antwort([{ id: app!.id }]);
      }
      throw new Error("Unvorbereitete künstliche Abfrage");
    } },
  });
  return { sb, calls, get app() { return app; } };
}

for (const tabelle of ["contacts", "interviews", "application_events"]) {
  for (const count of [null, "fehler", -1] as const) {
    test(`Entmerken bricht bei ${tabelle}/${count} vor DELETE ab`, async () => {
      const d = datenbank({ counts: { [tabelle]: count } });
      assert.deepEqual(await entmerkenMit(d.sb, "test-stelle"), { art: "fehler" });
      assert.ok(!d.calls.some(c => c.method === "DELETE"));
      assert.ok(d.app);
    });
  }
}

test("Entmerken behandelt Lesefehler, fehlende und fortgeschrittene Bewerbung", async () => {
  for (const [optionen, erwartet] of [
    [{ lesefehler: true }, { art: "fehler" }],
    [{ app: null }, { art: "fertig" }],
    [{ app: { id: "test", status: "im_gespraech" } }, { art: "fertig" }],
  ] as const) {
    const d = datenbank(optionen);
    assert.deepEqual(await entmerkenMit(d.sb, "test-stelle"), erwartet);
    assert.ok(d.calls.every(c => c.method === "GET"));
  }
});

test("Entmerken erhält eigene Felder oder verknüpfte Inhalte", async () => {
  for (const optionen of [{ app: { id: "test-bewerbung", status: "gemerkt", notizen: "Eigene Notiz" } },
    ...["contacts", "interviews", "application_events"].map(t => ({ counts: { [t]: 1 } }))]) {
    const d = datenbank(optionen);
    assert.deepEqual(await entmerkenMit(d.sb, "test-stelle"), { art: "eigene_eingaben", id: "test-bewerbung" });
    assert.ok(!d.calls.some(c => c.method === "DELETE"));
  }
});

test("Entmerken löscht nur erfolgreich leer geprüfte gemerkte Bewerbung, Schreibfehler bleiben Fehler", async () => {
  for (const loeschfehler of [false, true]) {
    const d = datenbank({ loeschfehler });
    assert.deepEqual(await entmerkenMit(d.sb, "test-stelle"), { art: loeschfehler ? "fehler" : "fertig" });
    const del = d.calls.find(c => c.method === "DELETE")!;
    assert.equal(del.url.searchParams.get("status"), "eq.gemerkt");
    assert.equal(d.app === null, !loeschfehler);
  }
});

test("aufBeworben meldet Lesefehler und fehlende Bewerbung als Fehler ohne PATCH", async () => {
  for (const optionen of [{ lesefehler: true }, { app: null }]) {
    const d = datenbank(optionen);
    assert.equal(await aufBeworben(d.sb, "test-bewerbung", "2026-11-16"), false);
    assert.ok(d.calls.every(c => c.method === "GET"));
  }
});

test("aufBeworben erhält parallelen Statusfortschritt, Datum und zwischenzeitliche Löschung", async () => {
  for (const patch of [{ status: "im_gespraech" }, { beworben_am: "2026-11-15" }]) {
    const d = datenbank({ vorUpdate: a => Object.assign(a, patch) });
    assert.equal(await aufBeworben(d.sb, "test-bewerbung", "2026-11-16"), false);
    assert.deepEqual(d.app, { id: "test-bewerbung", status: "gemerkt", beworben_am: null, ...patch });
  }
  const d = datenbank({ verschwindetVorUpdate: true });
  assert.equal(await aufBeworben(d.sb, "test-bewerbung", "2026-11-16"), false);
  assert.equal(d.app, null);
});

test("aufBeworben prüft Updateergebnis und bewahrt bereits vorhandene Werte", async () => {
  for (const status of ["gemerkt", "beworben", "im_gespraech", "angebot", "abgeschlossen"]) {
    for (const datum of [null, "2026-11-15"]) {
      const d = datenbank({ app: { id: "test-bewerbung", status, beworben_am: datum } });
      assert.equal(await aufBeworben(d.sb, "test-bewerbung", "2026-11-16"), true);
      assert.equal(d.app!.status, status === "gemerkt" ? "beworben" : status);
      assert.equal(d.app!.beworben_am, datum ?? "2026-11-16");
      for (const call of d.calls.filter(c => c.method === "PATCH")) {
        assert.equal(call.url.searchParams.get("status"), `eq.${status}`);
        assert.equal(call.url.searchParams.get("beworben_am"), datum ? `eq.${datum}` : "is.null");
      }
    }
  }
  const d = datenbank({ schreibfehler: true });
  assert.equal(await aufBeworben(d.sb, "test-bewerbung", "2026-11-16"), false);
});

const uid = "11111111-1111-4111-8111-111111111111";
const eigeneId = "22222222-2222-4222-8222-222222222222";
const job = { id: "Prüffirma:7", url: "https://karriere.example.invalid/stellen", titel: "Analyst" };
const manuell = { id: eigeneId, owner_id: uid, job_id: null, link: job.url, status: "gemerkt", beworben_am: null, notizen: "Eigene Notiz" };
const andererJob = { ...manuell, id: "33333333-3333-4333-8333-333333333333", job_id: "Prüffirma:9" };
const neueId = "44444444-4444-4444-8444-444444444444";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const stellenActions = ts.transpileModule(readFileSync(new URL("../app/stellen/actions.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function stellenAktionen({ vorhanden, kollidiert, migrationFehlt }: {
  vorhanden?: Record<string, unknown>; kollidiert?: Record<string, unknown>; migrationFehlt?: boolean;
} = {}) {
  const zeilen: Record<string, unknown>[] = [{ ...manuell, id: "55555555-5555-4555-8555-555555555555", owner_id: neueId }, andererJob];
  if (vorhanden) zeilen.push({ ...vorhanden });
  const aufrufe: { methode: string; q: URLSearchParams }[] = [];
  const sb = createClient("https://datenbank.example.invalid", "synthetisch", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      const q = url.searchParams;
      const methode = init?.method ?? "GET";
      if (url.pathname.endsWith("/jobs")) return Response.json([job]);
      assert.equal(url.pathname, "/rest/v1/applications");
      aufrufe.push({ methode, q });
      if (migrationFehlt && q.has("portal_link")) return Response.json({ code: "42703" }, { status: 400 });
      const sichtbar = zeilen.filter(z => z.owner_id === uid); // Eigentümergrenze der Datenbank
      const a = sichtbar.filter(z => [...q].every(([feld, wert]) => ["select", "limit", "order"].includes(feld)
        || (wert === "is.null" ? z[feld] === null : wert === `eq.${z[feld]}`))).slice(0, Number(q.get("limit") ?? sichtbar.length));
      if (methode === "GET") return Response.json(a);
      if (methode === "PATCH") {
        for (const z of a) Object.assign(z, JSON.parse(String(init?.body)));
        return Response.json(a);
      }
      assert.equal(methode, "POST");
      if (kollidiert) {
        zeilen.push({ ...kollidiert });
        return Response.json({ code: "23505" }, { status: 409 });
      }
      zeilen.push({ ...JSON.parse(String(init?.body)), id: neueId, owner_id: uid, beworben_am: null });
      return Response.json({ id: neueId }, { status: 201 });
    } },
  });
  sb.auth.getClaims = (async () => ({ data: { claims: { sub: uid } }, error: null })) as typeof sb.auth.getClaims;
  const imports: Record<string, object> = {
    "next/navigation": { redirect: (pfad: string) => { throw new Error(pfad); } },
    "next/cache": { revalidatePath: () => {} },
    "@/lib/supabase/server": { createClient: async () => sb },
    "@/lib/bewerbung-anlegen": { anlegenAusJob, aufBeworben },
    "@/lib/fehler": { fehlerText: () => "Künstlicher allgemeiner Fehler" },
    "@/lib/filter": { heuteLokal: () => "2026-11-21" },
    "@/lib/tracker-daten": { ladeZugZeile: async () => ({ alt: { status: "gemerkt" }, offline: false, fehler: false }) }, "@/lib/offline": offline,
    "@/lib/bewerbung-schutz": {}, "@/lib/nutzer": {}, "@/lib/supabase/admin": {}, "@/lib/firmendaten-issue": {}, "@/lib/wunschfirmen": {}, "@/lib/listen-ansicht": {}, "@/lib/anzeige": {}, "../cv-abgleich": {},
  };
  const exports = {} as Record<"merken" | "beworben", (id: string) => Promise<void>>;
  runInNewContext(stellenActions, { exports, require: (name: string) => imports[name] ?? assert.fail(name) });
  return { ...exports, aufrufe, zeilen };
}

test("Merken und Bewerben öffnen eine eigene manuelle Bewerbung zur Stellen-URL ohne Schreibzugriff", async () => {
  for (const aktion of ["merken", "beworben"] as const) {
    const d = stellenAktionen({ vorhanden: manuell });
    await assert.rejects(d[aktion](job.id), { message: `/bewerbung/${eigeneId}` });
    assert.deepEqual(d.aufrufe.map(({ methode, q }) => [methode, q.get("owner_id"), q.get("job_id"), q.get("link")]),
      [["GET", `eq.${uid}`, `eq.${job.id}`, null], ["GET", `eq.${uid}`, "is.null", `eq.${job.url}`]]);
    assert.deepEqual(d.zeilen.at(-1), manuell);
  }
});

test("URL-Dublette nach konkurrierender Anlage wird erneut gelesen und bleibt unverändert", async () => {
  const d = stellenAktionen({ kollidiert: manuell });
  await assert.rejects(d.beworben(job.id), { message: `/bewerbung/${eigeneId}` });
  assert.deepEqual(d.aufrufe.map(a => a.methode), ["GET", "GET", "GET", "POST", "GET", "GET"]);
  assert.deepEqual(d.zeilen.at(-1), manuell);
});

test("Stellenaktionen finden den eigenen Eintrag über portal_link auch nach Schreibkonflikt", async () => {
  const alias = { ...manuell, link: "https://andere.example.invalid/stellen/7", portal_link: job.url };
  for (const aktion of ["merken", "beworben"] as const) {
    for (const option of [{ vorhanden: alias }, { kollidiert: alias }]) {
      const d = stellenAktionen(option);
      await assert.rejects(d[aktion](job.id), { message: `/bewerbung/${eigeneId}` });
      assert.deepEqual(d.zeilen.at(-1), alias);
      assert.equal(d.aufrufe.filter(a => a.methode === "POST").length, "kollidiert" in option ? 1 : 0);
      assert.ok(!d.aufrufe.some(a => a.methode === "PATCH" || a.methode === "DELETE"));
      assert.deepEqual([...d.aufrufe.at(-1)!.q.entries()].filter(([feld]) => ["owner_id", "job_id", "portal_link"].includes(feld)),
        [["owner_id", `eq.${uid}`], ["job_id", "is.null"], ["portal_link", `eq.${job.url}`]]);
    }
  }
  const andereStelle = stellenAktionen({ vorhanden: { ...alias, job_id: andererJob.job_id } });
  await andereStelle.merken(job.id);
  assert.equal(andereStelle.zeilen.at(-1)?.id, neueId);
  assert.equal(andereStelle.zeilen.at(-1)?.job_id, job.id);
});

test("Merken bleibt auch vor Migration 020 möglich", async () => {
  const d = stellenAktionen({ migrationFehlt: true });
  await d.merken(job.id);
  assert.equal(d.zeilen.at(-1)?.job_id, job.id);
});

test("Andere Job-ID derselben URL bleibt eine eigene Stelle und normales Bewerben setzt Status und Datum", async () => {
  const d = stellenAktionen();
  await d.merken(job.id);
  await assert.rejects(d.beworben(job.id), { message: `/bewerbung/${neueId}` });
  const neu = d.zeilen.at(-1);
  assert.equal(neu?.job_id, job.id);
  assert.equal(neu?.status, "beworben");
  assert.equal(neu?.beworben_am, "2026-11-21");
  assert.deepEqual(d.zeilen[1], andererJob);
});
