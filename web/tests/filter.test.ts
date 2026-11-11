import { test } from "node:test";
import assert from "node:assert/strict";
import { leseFilter, filterZuUrl, escapeIlike, tagePlus, GROESSEN_REIHENFOLGE, levelText, onlineSeitGrenze, istNeu, facettenSortieren, LEVEL_REIHENFOLGE, stadtAnzeige, suchBedingung, formZuUrl, landNurMitFacette, ID_FORM } from "../lib/filter.ts";

test("leerer Filter gibt /stellen", () => {
  const f = leseFilter({});
  assert.equal(filterZuUrl(f), "/stellen");
  assert.equal(f.seite, 1);
  assert.deepEqual(f.stadt, []);
});

test("Rundreise mit Mehrfachwerten, Stichwort, Datum, Seite", () => {
  const url = "/stellen?level=Senior&level=Lead&stadt=Berlin&stadt=Remote&q=data+engineer&volltext=1&seit=7&seite=3";
  const f = leseFilter(Object.fromEntries([...new Set(new URL(url, "http://x").searchParams.keys())]
    .map((k) => [k, new URL(url, "http://x").searchParams.getAll(k)])));
  assert.deepEqual(f.level, ["Senior", "Lead"]);
  assert.equal(f.q, "data engineer");
  assert.equal(f.seite, 3);
  assert.equal(filterZuUrl(f), url);
});

test("Einzelwert, Muell und Duplikate werden bereinigt", () => {
  const f = leseFilter({ firma: "SAP", stadt: ["A", "A", " ", ""], seit: "gestern", seite: "-4" });
  assert.deepEqual(f.firma, ["SAP"]);
  assert.deepEqual(f.stadt, ["A"]);
  assert.equal(f.seit, "");
  assert.equal(f.seite, 1);
});

test("Sonderzeichen in Werten bleiben nach der Rundreise erhalten", () => {
  const f = leseFilter({ stadt: "Frankfurt, Main & Co" });
  const u = new URL(filterZuUrl(f), "http://x");
  assert.equal(u.searchParams.get("stadt"), "Frankfurt, Main & Co");
});

test("escapeIlike maskiert %, _, Komma, Klammern, Anfuehrungszeichen", () => {
  assert.equal(escapeIlike("100%_"), '"%100\\\\%\\\\_%"');
  assert.equal(escapeIlike('a,b(c)"'), '"%a,b(c)\\"%"');
});

test("tagePlus ueber Monatsgrenze", () => {
  assert.equal(tagePlus("2026-11-01", -2), "2026-10-30");
});

const JETZT = new Date(2026, 10, 8, 12);

test("levelText fuer alle Stufen", () => {
  assert.equal(levelText("Junior"), "Junior (0–2 Jahre)");
  assert.equal(levelText("Mid"), "Mid (2–5 Jahre)");
  assert.equal(levelText("Senior"), "Senior (5–8 Jahre)");
  assert.equal(levelText("Lead"), "Lead (8+ Jahre)");
});

test("onlineSeitGrenze fuer alle Werte", () => {
  assert.equal(onlineSeitGrenze("heute", JETZT), "2026-11-08");
  assert.equal(onlineSeitGrenze("3", JETZT), "2026-11-05");
  assert.equal(onlineSeitGrenze("7", JETZT), "2026-11-01");
  assert.equal(onlineSeitGrenze("30", JETZT), "2026-10-09");
});

test("istNeu an der Grenze von 3 Tagen", () => {
  assert.equal(istNeu("2026-11-05", JETZT), true);
  assert.equal(istNeu("2026-11-04", JETZT), false);
  assert.equal(istNeu("2026-11-08", JETZT), true);
});

test("stadtAnzeige mit und ohne Filter", () => {
  assert.equal(stadtAnzeige(["Berlin", "Hamburg", "Köln"], []), "Berlin +2 weitere");
  assert.equal(stadtAnzeige(["Berlin"], []), "Berlin");
  assert.equal(stadtAnzeige(["Berlin", "Hamburg"], ["Hamburg"]), "Hamburg");
  assert.equal(stadtAnzeige(["Berlin", "Hamburg"], ["München"]), "Berlin +1 weitere");
  assert.equal(stadtAnzeige([], []), "");
});

test("Groessen-Reihenfolge", () => {
  assert.deepEqual(GROESSEN_REIHENFOLGE, ["<50", "50–249", "250–999", "1.000+"]);
});

test("Suche nur im Titel, mit volltext auch im Text", () => {
  assert.equal(suchBedingung("x", false), 'titel.ilike."%x%"');
  assert.equal(suchBedingung("x", true), 'titel.ilike."%x%",text.ilike."%x%"');
  assert.equal(leseFilter({ volltext: "1" }).volltext, true);
  assert.equal(leseFilter({}).volltext, false);
});

test("Land-Filter wird ohne Facette ignoriert", () => {
  const f = leseFilter({ land: "Österreich" });
  assert.deepEqual(landNurMitFacette(f, false).land, []);
  assert.deepEqual(landNurMitFacette(f, true).land, ["Österreich"]);
});

test("ID_FORM: Firma mit Leerzeichen ok, ohne Doppelpunkt oder mit Leerzeichen in ext nicht", () => {
  assert.ok(ID_FORM.test("The Exploration Company:abc-123"));
  assert.ok(ID_FORM.test("Helsing:x"));
  assert.ok(!ID_FORM.test("kein-doppelpunkt"));
  assert.ok(!ID_FORM.test("a:b c"));
});

test("Level-Facette in fester Reihenfolge, Unbekanntes ans Ende", () => {
  assert.deepEqual(LEVEL_REIHENFOLGE, ["Junior", "Mid", "Senior", "Lead"]);
  assert.deepEqual(facettenSortieren("level", ["Senior", "Praktikum", "Lead", "Junior", "Mid"]), ["Junior", "Mid", "Senior", "Lead", "Praktikum"]);
  assert.deepEqual(facettenSortieren("groesse", ["1.000+", "<50"]), ["<50", "1.000+"]);
  assert.deepEqual(facettenSortieren("stadt", ["Wien", "Berlin"]), ["Berlin", "Wien"]);
});

test("istNeu: Stellen des ersten Laufs sind nie neu", () => {
  assert.equal(istNeu("2026-11-07", JETZT, "2026-11-07"), false);
  assert.equal(istNeu("2026-11-08", JETZT, "2026-11-07"), true);
  assert.equal(istNeu("2026-11-07", JETZT, null), true);
});

test("sort: Unbekanntes wird neu, firma und neu in der URL", () => {
  assert.equal(leseFilter({ sort: "foo" }).sort, "neu");
  const leer = leseFilter({});
  assert.ok(filterZuUrl({ ...leer, sort: "firma" }).includes("sort=firma"));
  assert.ok(!filterZuUrl({ ...leer, sort: "neu" }).includes("sort"));
});

test("formZuUrl: Filterwechsel behaelt q aus der Adresse, Suche nimmt es aus dem Formular", () => {
  const form = new URLSearchParams("q=neu&volltext=1&level=Senior&sort=neu&seite=3&seit=");
  const aktuell = new URLSearchParams("q=alt");
  assert.equal(formZuUrl("/stellen", form, aktuell, false), "/stellen?level=Senior&q=alt");
  assert.equal(formZuUrl("/stellen", form, aktuell, true), "/stellen?q=neu&volltext=1&level=Senior");
  assert.equal(formZuUrl("/stellen", new URLSearchParams("sort=firma"), new URLSearchParams(), false), "/stellen?sort=firma");
});

test("formZuUrl mit textFelder [firma]: ungesendeter Firmentext kommt aus der Adresse", () => {
  const form = new URLSearchParams("firma=neu&status=beworben");
  const aktuell = new URLSearchParams("firma=alt");
  assert.equal(formZuUrl("/bewerbungen", form, aktuell, false, ["firma"]), "/bewerbungen?status=beworben&firma=alt");
  assert.equal(formZuUrl("/bewerbungen", form, aktuell, true, ["firma"]), "/bewerbungen?firma=neu&status=beworben");
});
