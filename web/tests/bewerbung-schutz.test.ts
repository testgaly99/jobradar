import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { aufBeworben, entmerkenMit } from "../lib/bewerbung-schutz.ts";

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
