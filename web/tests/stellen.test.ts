import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { leseFilter } from "../lib/filter.ts";
import { PRO_SEITE, stellenAbfrage } from "../lib/stellen.ts";

test("Standard- und Rankingabfrage behalten sichere Seitenbereiche und 50 Treffer pro Seite", async () => {
  assert.equal(PRO_SEITE, 50);
  for (const mitListe of [false, true]) {
    const aufrufe: URL[] = [];
    const sb = createClient("https://datenbank.example.invalid", "test-ohne-zugangsdaten", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: async (input) => {
        const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
        aufrufe.push(url);
        return new Response("[]", { headers: { "Content-Type": "application/json" } });
      } },
    });
    for (const [seite, offset] of [[1, "0"], [2, "50"], [3, "100"], [180143985094819, "9007199254740900"]] as const) {
      const f = leseFilter({ liste: mitListe ? "test-a" : undefined, sort: mitListe ? "rang" : "titel", q: "Data" });
      const ergebnis = await stellenAbfrage(sb, { ...f, seite });
      assert.equal(ergebnis.error, null);
      const url = aufrufe.at(-1)!;
      assert.equal(url.pathname, mitListe ? "/rest/v1/rpc/ranking_stellen" : "/rest/v1/jobs");
      assert.equal(url.searchParams.get("offset"), offset);
      assert.equal(url.searchParams.get("limit"), "50");
      assert.equal(url.searchParams.get("order"), mitListe ? "rang.asc.nullslast,unternehmen.asc,id.asc" : "titel.asc,id.asc");
      assert.ok(url.searchParams.get("or")?.includes("titel.ilike"));
    }
    assert.equal(aufrufe.length, 4);
  }
});

test("Auch direkt gebaute ungültige Filter erzeugen in beiden Abfragewegen nur den ersten sicheren Bereich", async () => {
  for (const liste of [[], ["test-a"]]) {
    let anzahl = 0;
    const sb = createClient("https://datenbank.example.invalid", "test-ohne-zugangsdaten", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: async (input) => {
        const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
        anzahl++;
        assert.equal(url.searchParams.get("offset"), "0");
        assert.equal(url.searchParams.get("limit"), "50");
        return new Response("[]", { headers: { "Content-Type": "application/json" } });
      } },
    });
    for (const seite of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER, 180143985094820, 180143985094821]) {
      const ergebnis = await stellenAbfrage(sb, { ...leseFilter({}), liste, seite });
      assert.equal(ergebnis.error, null, String(seite));
    }
    assert.equal(anzahl, 8);
  }
});

for (const mitListe of [false, true]) {
  test(`${mitListe ? "Ranking" : "Standard"}: Größe wird vor Pagination global geordnet`, async () => {
    // Bereits geordnete künstliche Serverantwort; beweist den HTTP-Vertrag, keine SQL-Ausführung.
    const erwartet = [
      ...Array.from({ length: 57 }, (_, i) => ({ id: `klein:${i}`, companies: { groesse_klasse: "<50" } })),
      ...Array.from({ length: 52 }, (_, i) => ({ id: `mittel:${i}`, companies: { groesse_klasse: "50–249" } })),
      { id: "gross:1", companies: { groesse_klasse: "250–999" } },
      { id: "sehrgross:1", companies: { groesse_klasse: "1.000+" } },
      { id: "unbekannt:1", companies: { groesse_klasse: null } },
    ];
    const aufrufe: URL[] = [];
    const sb = createClient("https://datenbank.example.invalid", "test-ohne-zugangsdaten", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: async input => {
        const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
        aufrufe.push(url);
        const offset = Number(url.searchParams.get("offset"));
        return new Response(JSON.stringify(erwartet.slice(offset, offset + 50)), {
          headers: { "Content-Type": "application/json", "content-range": `${offset}-${Math.min(offset + 49, erwartet.length - 1)}/${erwartet.length}` },
        });
      } },
    });
    const ids: string[] = [];
    for (const seite of [1, 2, 3]) {
      const r = await stellenAbfrage(sb, { ...leseFilter({ sort: "groesse", liste: mitListe ? ["test-a", "test-b"] : undefined, level: "Senior" }), seite });
      assert.equal(r.error, null);
      assert.equal(r.count, erwartet.length);
      ids.push(...((r.data ?? []) as unknown as { id: string }[]).map(j => j.id));
    }
    assert.deepEqual(ids, erwartet.map(j => j.id));
    assert.deepEqual(aufrufe.map(u => u.searchParams.get("offset")), ["0", "50", "100"]);
    for (const url of aufrufe) {
      assert.equal(url.searchParams.get("order"), `${mitListe ? "companies->groesse_rang" : "companies(groesse_rang)"}.asc,erstmals_gesehen.desc,id.asc`);
      assert.equal(url.searchParams.get("erfahrungslevel"), "in.(Senior)");
      assert.equal(url.searchParams.get("limit"), "50");
    }
  });
}
