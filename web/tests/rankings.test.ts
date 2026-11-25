import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { GRUPPEN, leseFilter, filterZuUrl } from "../lib/filter.ts";
import { stellenAbfrage } from "../lib/stellen.ts";
import { ladeRankingKatalog, ladeRankingZuordnungen, rankingFilter, rankingHinweis, rankingQuellUrl } from "../lib/rankings.ts";

function datenbank(antwort: (url: URL, init: RequestInit) => Response) {
  const aufrufe: URL[] = [];
  const sb = createClient("https://datenbank.example.invalid", "test-ohne-zugangsdaten", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      aufrufe.push(url);
      return antwort(url, init ?? {});
    }) as typeof fetch },
  });
  return { sb, aufrufe };
}
const json = (daten: unknown, status = 200, headers = {}) => new Response(JSON.stringify(daten), {
  status, headers: { "Content-Type": "application/json", ...headers },
});

test("Listen stehen zuerst und behalten stabile Kennungen in der Adresse", () => {
  const f = leseFilter({ liste: ["test-b", "test-a", "test-a"], sort: "rang", seite: "2" });
  assert.equal(GRUPPEN[0], "liste");
  assert.deepEqual(f.liste, ["test-b", "test-a"]);
  assert.equal(filterZuUrl(f), "/stellen?liste=test-b&liste=test-a&sort=rangliste&seite=2");
});

test("Gäste verlieren Listenparameter und Rangsortierung; andere Filter bleiben", () => {
  const f = leseFilter({ liste: "test-a", sort: "rang", firma: "Testfirma", volltext: "1" });
  assert.deepEqual(rankingFilter(f, false), { ...f, liste: [], sort: "neu", volltext: false });
  assert.deepEqual(rankingFilter(f, true), f);
});

test("Gast löst keinerlei Ranking-Abfragen aus", async () => {
  const { sb, aufrufe } = datenbank(() => { throw new Error("Gast darf das nicht abfragen"); });
  assert.deepEqual(await ladeRankingKatalog(sb, false), { listen: [], verfuegbar: false, fehler: null });
  assert.deepEqual(await ladeRankingZuordnungen(sb, false, ["Testfirma"]), { zuordnungen: [], fehler: null });
  assert.equal(aufrufe.length, 0);
});

test("Fehlende Migration und Serverfehler werden unterschieden", async () => {
  const fehlt = datenbank(() => json({ code: "PGRST202", message: "not installed" }, 404));
  const katalog = await ladeRankingKatalog(fehlt.sb, true);
  assert.deepEqual(katalog, { listen: [], verfuegbar: false, fehler: null });
  assert.equal(rankingHinweis(leseFilter({}), katalog), null);
  assert.match(rankingHinweis(leseFilter({ liste: "test-a" }), katalog)!, /noch nicht eingerichtet/);
  const kaputt = datenbank(() => json({ code: "XX000", message: "interne geheime Details" }, 500));
  const fehler = await ladeRankingKatalog(kaputt.sb, true);
  assert.match(fehler.fehler!, /nicht geladen/);
  assert.doesNotMatch(fehler.fehler!, /geheime Details/);
});

test("Unbekannte und abgelaufene Listen führen zu einem Hinweis", () => {
  const katalog = { listen: [{ id: "test-a", name: "Künstliche Liste", anzahl: 3 }], verfuegbar: true, fehler: null };
  assert.equal(rankingHinweis(leseFilter({ liste: "test-a" }), katalog), null);
  assert.match(rankingHinweis(leseFilter({ liste: ["test-a", "veraltet"] }), katalog)!, /nicht mehr verfügbar/);
});

test("Katalog lädt mehr als 1.000 Listen vollständig und in stabiler Reihenfolge", async () => {
  const alle = Array.from({ length: 1001 }, (_, i) => ({ id: `test-${String(i).padStart(4, "0")}`, name: `Liste ${i}`, anzahl: 2 }));
  const { sb, aufrufe } = datenbank((url) => {
    const von = Number(url.searchParams.get("offset") ?? "0");
    const n = Number(url.searchParams.get("limit"));
    assert.equal(url.searchParams.get("order"), "id.asc");
    return json(alle.slice(von, von + n));
  });
  const k = await ladeRankingKatalog(sb, true);
  assert.equal(k.listen.length, 1001);
  assert.equal(k.verfuegbar, true);
  assert.equal(aufrufe.length, 3);
});

test("Zuordnungen paginieren vollständig und filtern Firmen mit gebundenem Parameter", async () => {
  const alle = Array.from({ length: 1001 }, (_, i) => ({ unternehmen: "Testfirma", liste_id: `liste-${i}`, name: `Liste ${i}`, jahr: 2026, rang: i + 1, quelle_url: "https://quelle.example.invalid/", lizenz: "Künstliche Testdaten" }));
  const { sb, aufrufe } = datenbank((url, init) => {
    assert.deepEqual(JSON.parse(String(init.body)), { p_firmen: ["Testfirma"] });
    assert.equal(url.searchParams.get("order"), "unternehmen.asc,liste_id.asc");
    const von = Number(url.searchParams.get("offset") ?? "0");
    return json(alle.slice(von, von + Number(url.searchParams.get("limit"))));
  });
  const daten = await ladeRankingZuordnungen(sb, true, ["Testfirma", "Testfirma"]);
  assert.equal(daten.zuordnungen.length, 1001);
  assert.equal(aufrufe.length, 3);
});

test("Quell-Links erlauben nur saubere HTTPS-Adressen ohne Zugangsdaten", () => {
  assert.equal(rankingQuellUrl("https://quelle.example.invalid/ranking?q=1"), "https://quelle.example.invalid/ranking?q=1");
  for (const u of ["javascript:alert(1)", "http://quelle.example.invalid", "https://a:b@quelle.example.invalid/", "https://quelle.example.invalid/\n", " https://quelle.example.invalid/", "/relativ", "https://", null]) {
    assert.equal(rankingQuellUrl(u), null, String(u));
  }
});

test("Listenfilter arbeitet serverseitig vor Seiteneinteilung und globaler Rangsortierung", async () => {
  const { sb, aufrufe } = datenbank((url, init) => {
    assert.equal(url.pathname, "/rest/v1/rpc/ranking_stellen");
    assert.deepEqual(JSON.parse(String(init.body)), { p_listen: ["test-a"] });
    assert.ok(new Headers(init.headers).get("Prefer")?.split(",").includes("count=exact"));
    assert.equal(url.searchParams.get("order"), "erstmals_gesehen.desc,id.asc"); // rangliste sortiert bis Paket 4 wie neu
    assert.equal(url.searchParams.get("offset"), "50");
    assert.equal(url.searchParams.get("limit"), "50");
    assert.equal(url.searchParams.get("groesse_klasse"), 'in.(250–999)');
    assert.equal(url.searchParams.get("level"), null);
    assert.equal(url.searchParams.get("erfahrungslevel"), 'in.(Senior)');
    assert.equal(url.searchParams.get("land"), 'in.(Deutschland)');
    assert.ok(url.searchParams.getAll("or").some((v) => v.includes("remote.eq.true")));
    assert.ok(url.searchParams.getAll("or").some((v) => v.includes("titel.ilike")));
    assert.ok(url.searchParams.getAll("or").some((v) => v.includes("titel.not.ilike")));
    assert.equal(url.searchParams.get("erstmals_gesehen")?.slice(0, 4), "gte.");
    assert.ok(!url.searchParams.get("select")?.includes("!inner"));
    return json([], 200, { "content-range": "50-99/1001" });
  });
  const r = await stellenAbfrage(sb, leseFilter({ liste: "test-a", sort: "rang", seite: "2", groesse: "250–999", level: "Senior", stadt: ["Teststadt", "Remote"], land: "Deutschland", q: "Data", ohne: "Sales", seit: "7" }));
  assert.equal(r.error, null, JSON.stringify(r.error));
  assert.equal(r.count, 1001);
  assert.equal(aufrufe.length, 1);
});

test("Ohne Liste bleibt die bisherige Stellenabfrage erhalten", async () => {
  const { sb } = datenbank((url) => {
    assert.equal(url.pathname, "/rest/v1/jobs");
    assert.equal(url.searchParams.get("companies.aktiv"), "eq.true");
    assert.ok(url.searchParams.get("select")?.includes("companies!inner"));
    return json([]);
  });
  await stellenAbfrage(sb, leseFilter({}));
});
