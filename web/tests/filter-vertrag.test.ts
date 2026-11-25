import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { filterZuUrl, formZuUrl, landNurMitFacette, leseFilter, type Filter, type Gruppe } from "../lib/filter.ts";
import { rankingFilter } from "../lib/rankings.ts";
import { stellenAbfrage } from "../lib/stellen.ts";

async function abfrage(f: Filter) {
  const aufrufe: { url: URL; init: RequestInit }[] = [];
  const sb = createClient("https://datenbank.example.invalid", "test-ohne-zugangsdaten", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      aufrufe.push({ url: new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url), init: init ?? {} });
      return new Response("[]", { headers: { "Content-Type": "application/json", "content-range": "0-49/123" } });
    } },
  });
  const ergebnis = await stellenAbfrage(sb, f);
  assert.equal(ergebnis.error, null);
  assert.equal(ergebnis.count, 123);
  assert.equal(aufrufe.length, 1);
  return aufrufe[0];
}

const gruppen: { gruppe: Gruppe; werte: string[]; spalte: string; ranking?: string; wert: string }[] = [
  { gruppe: "groesse", werte: ["<50", "250–999"], spalte: "companies.groesse_klasse", ranking: "groesse_klasse", wert: "in.(<50,250–999)" },
  { gruppe: "kategorie", werte: ["Finanzen", "Luft- & Raumfahrt, Verteidigung"], spalte: "companies.kategorie", ranking: "kategorie", wert: 'ov.{"Finanzen","Luft- & Raumfahrt, Verteidigung"}' },
  { gruppe: "level", werte: ["Senior", "Lead"], spalte: "erfahrungslevel", wert: "in.(Senior,Lead)" },
  { gruppe: "modell", werte: ["Hybrid", "Remote"], spalte: "arbeitsmodell", wert: "in.(Hybrid,Remote)" },
  { gruppe: "vertrag", werte: ["Vollzeit", "Teilzeit"], spalte: "vertragsart", wert: "in.(Vollzeit,Teilzeit)" },
  { gruppe: "bereich", werte: ["Technik", "Finanzen"], spalte: "abteilung", wert: "in.(Technik,Finanzen)" },
  { gruppe: "firma", werte: ["Firma A", "Firma B"], spalte: "unternehmen", wert: "in.(Firma A,Firma B)" },
  { gruppe: "stadt", werte: ["Berlin", "Hamburg", "Remote"], spalte: "or", wert: '(staedte.ov.{"Berlin","Hamburg"},remote.eq.true)' },
  { gruppe: "land", werte: ["Deutschland", "Österreich"], spalte: "land", wert: "in.(Deutschland,Österreich)" },
];

for (const mitListe of [false, true]) {
  for (const fall of gruppen) {
    test(`${mitListe ? "Ranking" : "Standard"}: ${fall.gruppe} behält mehrere Werte als ODER-Gruppe`, async () => {
      const { url, init } = await abfrage(leseFilter({ liste: mitListe ? ["test-a", "test-b"] : undefined, [fall.gruppe]: fall.werte }));
      assert.equal(url.pathname, mitListe ? "/rest/v1/rpc/ranking_stellen" : "/rest/v1/jobs");
      assert.equal(url.searchParams.get(mitListe ? fall.ranking ?? fall.spalte : fall.spalte), fall.wert);
      assert.equal(url.searchParams.get("limit"), "50");
      assert.equal(url.searchParams.get("offset"), "0");
      assert.ok(new Headers(init.headers).get("Prefer")?.includes("count=exact"));
      if (mitListe) assert.deepEqual(JSON.parse(String(init.body)), { p_listen: ["test-a", "test-b"] });
      else {
        assert.equal(url.searchParams.get("status"), "eq.offen");
        assert.equal(url.searchParams.get("sichtbar"), "eq.true");
        assert.equal(url.searchParams.get("companies.aktiv"), "eq.true");
      }
    });
  }

  test(`${mitListe ? "Ranking" : "Standard"}: unterschiedliche Gruppen und OR-Blöcke bleiben mit UND verknüpft`, async () => {
    const p = Object.fromEntries(gruppen.map((g) => [g.gruppe, g.werte]));
    const { url } = await abfrage(leseFilter({ ...p, liste: mitListe ? "test-a" : undefined, q: "Data", ohne: "Sales Praktikum", volltext: "1", seite: "3" }));
    for (const g of gruppen.filter((g) => g.spalte !== "or"))
      assert.equal(url.searchParams.get(mitListe ? g.ranking ?? g.spalte : g.spalte), g.wert);
    assert.deepEqual(url.searchParams.getAll("or"), [
      '(staedte.ov.{"Berlin","Hamburg"},remote.eq.true)',
      '(titel.ilike."%Data%",text.ilike."%Data%")',
      '(titel.is.null,titel.not.ilike."%Sales%")', '(text.is.null,text.not.ilike."%Sales%")',
      '(titel.is.null,titel.not.ilike."%Praktikum%")', '(text.is.null,text.not.ilike."%Praktikum%")',
    ]);
    assert.equal(url.searchParams.get("offset"), "100");
    assert.equal(url.searchParams.get("limit"), "50");
  });

  test(`${mitListe ? "Ranking" : "Standard"}: Titelsuche und Ausschluss ohne Volltext greifen nicht auf text zu`, async () => {
    const { url } = await abfrage(leseFilter({ liste: mitListe ? "test-a" : undefined, q: "Data", ohne: "Sales sales a" }));
    assert.deepEqual(url.searchParams.getAll("or"), ['(titel.ilike."%Data%")', '(titel.is.null,titel.not.ilike."%Sales%")']);
  });
}

test("Alle Sortierungen und Rang-Fallbacks behalten stabile Reihenfolge und Pagination", async () => {
  for (const liste of [[], ["test-a"], ["test-a", "test-b"]]) {
    for (const [sort, standard] of [["neu", "erstmals_gesehen.desc,id.asc"], ["firma", "unternehmen.asc,id.asc"],
      ["titel", "titel.asc,id.asc"], ["groesse", "erstmals_gesehen.desc,id.asc"], ["rang", "erstmals_gesehen.desc,id.asc"]]) {
      const f = rankingFilter(leseFilter({ liste, sort, seite: "2" }), true);
      const { url } = await abfrage(f);
      assert.equal(url.searchParams.get("order"), sort === "groesse"
        ? `${liste.length ? "companies->groesse_rang" : "companies(groesse_rang)"}.asc,erstmals_gesehen.desc,id.asc`
        : standard);
      assert.equal(url.searchParams.get("offset"), "50");
      assert.equal(url.searchParams.get("limit"), "50");
    }
  }
});

test("Stadtgruppe behält reine Orte und ausschließlich Remote als eigene ODER-Blöcke", async () => {
  for (const [stadt, erwartet] of [[['Berlin', 'Hamburg'], '(staedte.ov.{"Berlin","Hamburg"})'], [['Remote'], '(remote.eq.true)']] as const) {
    const { url } = await abfrage(leseFilter({ stadt: [...stadt] }));
    assert.deepEqual(url.searchParams.getAll("or"), [erwartet]);
  }
});

test("Gäste behalten übrige Gruppen, verlieren Ranking und Textsuche", async () => {
  const f = rankingFilter(leseFilter({ liste: ["test-a", "test-b"], sort: "rang", volltext: "1", q: "Data", ohne: "Sales", land: "Deutschland", seite: "2" }), false);
  const { url } = await abfrage(f);
  assert.equal(url.pathname, "/rest/v1/jobs");
  assert.equal(url.searchParams.get("land"), "in.(Deutschland)");
  assert.equal(url.searchParams.get("offset"), "50");
  assert.equal(url.searchParams.get("order"), "erstmals_gesehen.desc,id.asc");
  assert.deepEqual(url.searchParams.getAll("or"), ['(titel.ilike."%Data%")', '(titel.is.null,titel.not.ilike."%Sales%")']);
});

test("Online-seit-Werte erreichen beide Abfragewege als Datumsuntergrenze", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 16, 12) });
  for (const liste of [[], ["test-a"]]) {
    for (const [seit, datum] of [["heute", "2026-11-16"], ["3", "2026-11-13"], ["7", "2026-11-09"], ["30", "2026-10-17"]]) {
      const { url } = await abfrage(leseFilter({ liste, seit }));
      assert.equal(url.searchParams.get("erstmals_gesehen"), `gte.${datum}`);
    }
  }
});

test("Filterwechsel und Entfernen einer Gruppe setzen Seite zurück und erhalten Suche sowie andere Gruppen", () => {
  const aktuell = new URLSearchParams("liste=test-a&groesse=%3C50&level=Senior&level=Lead&stadt=Berlin&q=Data&ohne=Sales&volltext=1&sort=firma&seite=3");
  const form = new URLSearchParams(aktuell);
  form.delete("stadt");
  form.set("q", "ungesendet");
  const url = new URL(formZuUrl("/stellen", form, aktuell, false), "http://test.invalid");
  const p = url.searchParams;
  assert.equal(p.has("seite"), false);
  assert.equal(p.has("stadt"), false);
  assert.deepEqual(p.getAll("level"), ["Senior", "Lead"]);
  assert.equal(p.get("q"), "Data");
  assert.equal(p.get("ohne"), "Sales");
  assert.equal(p.get("volltext"), "1");
  assert.equal(p.get("liste"), "test-a");
  assert.equal(p.get("sort"), "firma");
  assert.equal(formZuUrl("/stellen", new URLSearchParams(), new URLSearchParams(), true), "/stellen");
  assert.equal(filterZuUrl(leseFilter({})), "/stellen");
});

test("Leere und unbekannte Parameter sowie fehlende Land-Facette fügen keine Auswahlbedingungen hinzu", async () => {
  const f = landNurMitFacette(leseFilter({ land: "Deutschland", level: ["", " "], q: " ", ohne: "", status: "geschlossen", fremd: "x" }), false);
  const { url } = await abfrage(f);
  for (const key of ["land", "erfahrungslevel", "fremd", "or", "erstmals_gesehen"]) assert.equal(url.searchParams.has(key), false, key);
  assert.equal(url.searchParams.get("status"), "eq.offen");
});
