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
