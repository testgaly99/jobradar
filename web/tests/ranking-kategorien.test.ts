import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { leseFilter, filterZuUrl } from "../lib/filter.ts";
import { stellenAbfrage } from "../lib/stellen.ts";
import { rankingFilter, ladeRankingKategorien, ladeStoebernLinks } from "../lib/rankings.ts";

function db(antwort: (url: URL, init: RequestInit) => Response) {
  const calls: URL[] = [];
  const sb = createClient("https://datenbank.example.invalid", "test-ohne-zugangsdaten", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      calls.push(url); return antwort(url, init ?? {});
    }) as typeof fetch },
  });
  return { sb, calls };
}
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json" } });

test("Ranking-Kategorie bleibt von Branche getrennt, Gäste verlieren sie", () => {
  const f = leseFilter({ rangkategorie: ["Innovation", "Innovation"], kategorie: "Tech & Software" });
  assert.deepEqual(f.rangkategorie, ["Innovation"]);
  assert.deepEqual(f.kategorie, ["Tech & Software"]);
  assert.match(filterZuUrl(f), /rangkategorie=Innovation/);
  assert.deepEqual(rankingFilter(f, false).rangkategorie, []);
});

test("Kategorie wird vor Zählen und Pagination mit gebundenen Parametern gefiltert", async () => {
  for (const liste of [[], ["test-a"]]) {
    const { sb, calls } = db((url, init) => {
      assert.equal(url.pathname, "/rest/v1/rpc/ranking_stellen");
      assert.deepEqual(JSON.parse(String(init.body)), { p_listen: liste, p_kategorien: ["Innovation"] });
      assert.equal(url.searchParams.get("offset"), "50");
      assert.equal(url.searchParams.get("limit"), "50");
      assert.match(url.searchParams.get("select") ?? "", /companies/);
      assert.equal(url.searchParams.get("groesse_klasse"), "in.(1.000+)");
      return json([]);
    });
    assert.equal((await stellenAbfrage(sb, leseFilter({ liste, rangkategorie: "Innovation", seite: "2", groesse: "1.000+" }))).error, null);
    assert.equal(calls.length, 1);
  }
});

test("Gast fragt weder Kategorien noch Stöberlinks ab", async () => {
  const { sb, calls } = db(() => { throw new Error("Kein Gastzugriff"); });
  assert.deepEqual(await ladeRankingKategorien(sb, false, ["A"]), { kategorien: [], fehler: null });
  assert.deepEqual(await ladeStoebernLinks(sb, false), []);
  assert.equal(calls.length, 0);
});

test("Kategorieabruf akzeptiert ausschließlich Kategorie und Firma, keine fremden Namen/Ränge", async () => {
  const { sb } = db(() => json([{ unternehmen: "A", kategorie: "Innovation", name: "Geheimer Titel", rang: 1 }]));
  assert.deepEqual(await ladeRankingKategorien(sb, true, ["A"]), { kategorien: [{ unternehmen: "A", kategorie: "Innovation" }], fehler: null });
});

test("Stöberlinks filtern Art, unsichere Adressen und leere Titel; fehlende Tabelle entfällt", async () => {
  const { sb } = db((url) => {
    assert.equal(url.pathname, "/rest/v1/stoebern_links");
    assert.equal(url.searchParams.get("art"), "eq.stoebern");
    return json([
      { id: 1, titel: "Quelle", url: "https://quelle.example.invalid/", geprueft_am: "2026-11-20" },
      { id: 2, titel: "Unsicher", url: "javascript:alert(1)", geprueft_am: "2026-11-20" },
      { id: 3, titel: " ", url: "https://quelle.example.invalid/", geprueft_am: "2026-11-20" },
    ]);
  });
  assert.deepEqual(await ladeStoebernLinks(sb, true), [{ id: 1, titel: "Quelle", url: "https://quelle.example.invalid/", geprueft_am: "2026-11-20" }]);
  assert.deepEqual(await ladeStoebernLinks(db(() => json({ code: "42P01" }, 404)).sb, true), []);
});
