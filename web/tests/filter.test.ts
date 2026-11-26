import { test } from "node:test";
import assert from "node:assert/strict";
import { leseFilter, filterZuUrl, escapeIlike, tagePlus, GROESSEN_REIHENFOLGE, levelText, onlineSeitGrenze, istNeu, facettenSortieren, LEVEL_REIHENFOLGE, stadtAnzeige, suchBedingung, ausschlussWoerter, ausschlussBedingungen, formZuUrl, landNurMitFacette, ID_FORM, standardSortierung, sortCookie } from "../lib/filter.ts";

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

test("sort: Unbekanntes und entfallene firma/titel werden neu, groesse und neu in der URL", () => {
  assert.equal(leseFilter({ sort: "foo" }).sort, "neu");
  assert.equal(leseFilter({ sort: "firma" }).sort, "neu");
  assert.equal(leseFilter({ sort: "titel" }).sort, "neu");
  const leer = leseFilter({});
  assert.ok(filterZuUrl({ ...leer, sort: "groesse" }).includes("sort=groesse"));
  assert.ok(!filterZuUrl({ ...leer, sort: "neu" }).includes("sort"));
});

test("formZuUrl: Filterwechsel behaelt q aus der Adresse, Suche nimmt es aus dem Formular", () => {
  const form = new URLSearchParams("q=neu&volltext=1&level=Senior&sort=neu&seite=3&seit=");
  const aktuell = new URLSearchParams("q=alt");
  assert.equal(formZuUrl("/stellen", form, aktuell, false), "/stellen?level=Senior&sort=neu&q=alt");
  assert.equal(formZuUrl("/stellen", form, aktuell, true), "/stellen?q=neu&volltext=1&level=Senior&sort=neu");
  assert.equal(formZuUrl("/stellen", new URLSearchParams("sort=groesse"), new URLSearchParams(), false), "/stellen?sort=groesse");
});

test("formZuUrl behält sort=neu", () => {
  const form = new URLSearchParams("sort=neu&stadt=München");
  assert.equal(formZuUrl("/stellen", form, new URLSearchParams(), false), "/stellen?sort=neu&stadt=M%C3%BCnchen");
});

test("formZuUrl mit textFelder [firma]: ungesendeter Firmentext kommt aus der Adresse", () => {
  const form = new URLSearchParams("firma=neu&status=beworben");
  const aktuell = new URLSearchParams("firma=alt");
  assert.equal(formZuUrl("/bewerbungen", form, aktuell, false, ["firma"]), "/bewerbungen?status=beworben&firma=alt");
  assert.equal(formZuUrl("/bewerbungen", form, aktuell, true, ["firma"]), "/bewerbungen?firma=neu&status=beworben");
});

test("Ausschluss: Woerter aus Komma/Leerzeichen, ohne Duplikate und Einzelzeichen, hoechstens 10", () => {
  assert.deepEqual(ausschlussWoerter(" Praktikum,  Werkstudent praktikum , a "), ["Praktikum", "Werkstudent"]);
  assert.deepEqual(ausschlussWoerter(""), []);
  assert.equal(ausschlussWoerter(Array.from({ length: 15 }, (_, i) => "w" + i).join(" ")).length, 10);
});

test("Ausschluss: Titel immer, Anzeigentext nur mit Volltext; leere Felder bleiben drin", () => {
  assert.deepEqual(ausschlussBedingungen(["sales"], false), ['titel.is.null,titel.not.ilike."%sales%"']);
  assert.deepEqual(ausschlussBedingungen(["sales"], true), ['titel.is.null,titel.not.ilike."%sales%"', 'text.is.null,text.not.ilike."%sales%"']);
  assert.deepEqual(ausschlussBedingungen([], true), []);
});

test("Ausschluss: Rundreise ueber die Adresse", () => {
  const f = leseFilter({ ohne: "Praktikum, Sales" });
  assert.equal(f.ohne, "Praktikum, Sales");
  assert.equal(filterZuUrl(f), "/stellen?ohne=Praktikum%2C+Sales");
  assert.equal(leseFilter({}).ohne, "");
});

test("Ungültige Seitenzahlen und nicht sicher darstellbare Seitenbereiche fallen auf Seite 1 zurück", () => {
  for (const seite of ["", " ", "0", "-1", "1.5", "NaN", "Infinity", "-Infinity", "1e309", "falsch",
    "9007199254740991", "9007199254740992", "180143985094820", "180143985094821"]) {
    assert.equal(leseFilter({ seite }).seite, 1, seite);
  }
});

test("Bestehende Zahlenformate und größte vollständig sichere Seite bleiben erhalten", () => {
  for (const [roh, seite] of [["1", 1], ["2", 2], [" 3 ", 3], ["2.0", 2], ["2e0", 2], ["0x2", 2],
    ["1000000", 1000000], ["180143985094819", 180143985094819]] as const) {
    assert.equal(leseFilter({ seite: roh }).seite, seite, roh);
  }
});

test("Erster bereinigter Mehrfachwert und übrige Filter bleiben bei Seitenfehlern erhalten", () => {
  const f = leseFilter({ seite: [" ", "2", "3"], stadt: [" Berlin ", "Remote", "Berlin"], q: " Data ", sort: "groesse" });
  assert.equal(f.seite, 2);
  assert.deepEqual(f.stadt, ["Berlin", "Remote"]);
  assert.equal(f.q, "Data");
  assert.equal(f.sort, "groesse");
  assert.equal(leseFilter({ seite: ["Infinity", "2"] }).seite, 1);
});

test("URL-Schreiber lässt ungültige programmatische Seiten weg und erhält gültige Seiten und Filter", () => {
  const f = leseFilter({ level: ["Senior", "Lead"], q: "Data", sort: "groesse" });
  const basis = filterZuUrl(f);
  for (const seite of [0, -2, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER, 180143985094820]) {
    assert.equal(filterZuUrl({ ...f, seite }), basis, String(seite));
  }
  assert.equal(filterZuUrl({ ...f, seite: 2 }), basis + "&seite=2");
  assert.equal(filterZuUrl({ ...f, seite: 180143985094819 }), basis + "&seite=180143985094819");
});

test("sort: alter Wert rang wird rangliste", () => {
  assert.equal(leseFilter({ sort: "rang" }).sort, "rangliste");
  assert.ok(!filterZuUrl(leseFilter({})).includes("kat"));
});

test("dir: auf oder ab, ungueltig ab; nur auf steht in der URL", () => {
  assert.equal(leseFilter({ dir: "auf" }).richtung, "auf");
  assert.equal(leseFilter({ dir: "ab" }).richtung, "ab");
  assert.equal(leseFilter({ dir: "quer" }).richtung, "ab");
  assert.equal(leseFilter({}).richtung, "ab");
  assert.ok(filterZuUrl(leseFilter({ dir: "auf" })).includes("dir=auf"));
  assert.ok(!filterZuUrl(leseFilter({ dir: "ab" })).includes("dir"));
});

test("rl: Listen-ID oder alle; leer ist alle; nur Listen-ID steht in der URL", () => {
  assert.equal(leseFilter({ rl: "dax" }).rangliste, "dax");
  assert.equal(leseFilter({ rl: "" }).rangliste, "alle");
  assert.equal(leseFilter({}).rangliste, "alle");
  assert.ok(filterZuUrl(leseFilter({ sort: "rangliste", rl: "dax" })).includes("rl=dax"));
  assert.ok(!filterZuUrl(leseFilter({ sort: "rangliste" })).includes("rl"));
});

test("sortCookie prueft jedes Feld", () => {
  assert.deepEqual(sortCookie(JSON.stringify({ sort: "groesse", dir: "auf", rl: "dax" })), { sort: "groesse", dir: "auf", rl: "dax" });
  assert.deepEqual(sortCookie(JSON.stringify({ sort: "firma", dir: "quer", rl: 5 })), { sort: undefined, dir: undefined, rl: undefined });
  assert.deepEqual(sortCookie("kaputt{"), { sort: undefined, dir: undefined, rl: undefined });
  assert.deepEqual(sortCookie(undefined), { sort: undefined, dir: undefined, rl: undefined });
});

test("standardSortierung: Passung nur wenn verfuegbar, Cookie nur wenn gueltig", () => {
  assert.equal(standardSortierung(true, undefined), "passung");
  assert.equal(standardSortierung(false, undefined), "neu");
  assert.equal(standardSortierung(false, "passung"), "neu");
  assert.equal(standardSortierung(true, "groesse"), "groesse");
  assert.equal(standardSortierung(true, "firma"), "passung");
  assert.equal(standardSortierung(true, "unsinn"), "passung");
});
