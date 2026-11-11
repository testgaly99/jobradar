import { test } from "node:test";
import assert from "node:assert/strict";
import { STATUS, STATUS_LABEL, istUuid, parseAbschnitt, leseTabelle, tabelleZuUrl, escapeLike, berlinZuIso, beworbenPatch } from "../lib/bewerbung.ts";

const fd = (o: Record<string, string>) => ({ get: (k: string) => (k in o ? o[k] : null) });

test("jeder Status hat ein deutsches Label", () => {
  for (const s of STATUS) assert.ok(STATUS_LABEL[s]);
  assert.equal(STATUS.length, 6);
});

test("uuid-Pruefung", () => {
  assert.ok(istUuid("123e4567-e89b-42d3-a456-426614174000"));
  assert.ok(!istUuid("neu"));
  assert.ok(!istUuid("123e4567-e89b-42d3-a456-42661417400g"));
});

test("leere Eingaben werden null, nur Allowlist-Spalten kommen vor", () => {
  const r = parseAbschnitt("gehalt", fd({ gehalt_wunsch: " 80k ", gehalt_spanne_anzeige: "  ", owner_id: "x", status: "angebot" }));
  assert.ok("daten" in r);
  if ("daten" in r) {
    assert.equal(r.daten.gehalt_wunsch, "80k");
    assert.equal(r.daten.gehalt_spanne_anzeige, null);
    assert.ok(!("owner_id" in r.daten) && !("status" in r.daten));
    assert.equal(Object.keys(r.daten).length, 7);
  }
});

test("Einschaetzung: Interesse 1-5, Tags als Liste", () => {
  assert.deepEqual(parseAbschnitt("einschaetzung", fd({ interesse: "4", tags: " a, b ,, a ", notizen: "" })),
    { daten: { interesse: 4, tags: ["a", "b"], notizen: null } });
  assert.ok("fehler" in parseAbschnitt("einschaetzung", fd({ interesse: "6" })));
  assert.ok("fehler" in parseAbschnitt("einschaetzung", fd({ interesse: "2.5" })));
  assert.deepEqual(parseAbschnitt("einschaetzung", fd({ interesse: "", tags: "" })),
    { daten: { interesse: null, tags: null, notizen: null } });
});

test("Datum, Status und Ergebnis werden geprueft", () => {
  assert.ok("fehler" in parseAbschnitt("rahmen", fd({ starttermin: "morgen" })));
  assert.ok("fehler" in parseAbschnitt("rahmen", fd({ starttermin: "2026-02-31" })));
  assert.ok("daten" in parseAbschnitt("rahmen", fd({ starttermin: "2026-12-01" })));
  assert.ok("fehler" in parseAbschnitt("ablauf", fd({ status: "kaputt" })));
  assert.ok("fehler" in parseAbschnitt("ablauf", fd({ status: "" })));
  assert.ok("daten" in parseAbschnitt("ablauf", fd({ status: "angebot" })));
  assert.ok("fehler" in parseAbschnitt("ergebnis", fd({ ergebnis: "gewonnen" })));
  assert.ok("fehler" in parseAbschnitt("ergebnis", fd({ ergebnis: "constructor" })));
  assert.ok("fehler" in parseAbschnitt("person", fd({ name: "A", art: "toString" })));
  assert.deepEqual(parseAbschnitt("ergebnis", fd({ ergebnis: "" })),
    { daten: { ergebnis: null, absagegrund: null, feedback: null, rueckzug_grund: null } });
});

test("Pflichtfelder, Link und Dokument-ID", () => {
  assert.ok("fehler" in parseAbschnitt("stelle", fd({ firma: "A", titel: "" })));
  assert.ok("fehler" in parseAbschnitt("stelle", fd({ firma: "A", titel: "B", link: "javascript:alert(1)" })));
  assert.ok("daten" in parseAbschnitt("stelle", fd({ firma: "A", titel: "B", link: "https://x.de/a" })));
  assert.ok("fehler" in parseAbschnitt("bewerbung", fd({ cv_dokument_id: "nope" })));
  assert.ok("fehler" in parseAbschnitt("neu", fd({ firma: "A" })));
});

test("Tabellenfilter aus searchParams", () => {
  const f = leseTabelle({ status: ["beworben", "x", "beworben", "angebot"], firma: " SAP ", interesse: "3", sort: "drop table", dir: "asc" });
  assert.deepEqual(f.status, ["beworben", "angebot"]);
  assert.equal(f.firma, "SAP");
  assert.equal(f.interesse, 3);
  assert.equal(f.sort, "geaendert_am");
  assert.equal(f.dir, "asc");
  const d = leseTabelle({ interesse: "9" });
  assert.equal(d.interesse, null);
  assert.equal(d.dir, "desc");
});

test("tabelleZuUrl und escapeLike", () => {
  assert.equal(tabelleZuUrl(leseTabelle({})), "/bewerbungen");
  const u = new URL(tabelleZuUrl(leseTabelle({ status: "beworben", firma: "A&B", sort: "firma" })), "http://x");
  assert.equal(u.searchParams.get("firma"), "A&B");
  assert.equal(u.searchParams.get("sort"), "firma");
  assert.equal(escapeLike("100%_\\"), "100\\%\\_\\\\");
});

test("berlinZuIso: Winter, Sommer, Wechsel, leer", () => {
  assert.equal(berlinZuIso("2026-11-08T10:00"), "2026-11-08T09:00:00.000Z"); // MEZ
  assert.equal(berlinZuIso("2026-07-15T10:00"), "2026-07-15T08:00:00.000Z"); // MESZ
  assert.equal(berlinZuIso("2026-03-29T01:30"), "2026-03-29T00:30:00.000Z"); // vor dem Wechsel
  assert.equal(berlinZuIso("2026-03-29T03:30"), "2026-03-29T01:30:00.000Z"); // nach dem Wechsel
  assert.equal(berlinZuIso("2026-10-25T01:30"), "2026-10-24T23:30:00.000Z"); // vor Ende der Sommerzeit
  assert.equal(berlinZuIso("2026-10-25T04:00"), "2026-10-25T03:00:00.000Z"); // danach
  assert.equal(berlinZuIso(""), null);
});

test("Interview-Zeit wird als ISO gespeichert, leer wird null", () => {
  const a = parseAbschnitt("interview", fd({ datum: "2026-11-08T10:00" })), b = parseAbschnitt("interview", fd({ datum: "" }));
  assert.equal("daten" in a && a.daten.datum, "2026-11-08T09:00:00.000Z");
  assert.equal("daten" in b && b.daten.datum, null);
  assert.ok("fehler" in parseAbschnitt("interview", fd({ datum: "2026-11-08T25:00" })));
});

test("beworbenPatch setzt das Datum nur bei beworben und leerem Datum", () => {
  assert.deepEqual(beworbenPatch("beworben", null, "2026-11-10"), { beworben_am: "2026-11-10" });
  assert.deepEqual(beworbenPatch("beworben", "", "2026-11-10"), { beworben_am: "2026-11-10" });
  assert.deepEqual(beworbenPatch("beworben", "2026-11-01", "2026-11-10"), {});
  assert.deepEqual(beworbenPatch("gemerkt", null, "2026-11-10"), {});
});
