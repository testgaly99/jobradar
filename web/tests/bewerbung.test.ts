import { test } from "node:test";
import assert from "node:assert/strict";
import { STATUS, STATUS_LABEL, istUuid, parseAbschnitt, leseTabelle, tabelleZuUrl, escapeLike, berlinZuIso, beworbenPatch, datumOk } from "../lib/bewerbung.ts";
import { pruefeDokument } from "../lib/dokumente.ts";

const fd = (o: Record<string, string>) => ({ get: (k: string) => (k in o ? o[k] : null) });

test("jeder Status hat ein deutsches Label", () => {
  for (const s of STATUS) assert.ok(STATUS_LABEL[s]);
  assert.equal(STATUS.length, 5);
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
  // Speichern des Kastens "Bewerbung" darf das verknüpfte Anschreiben nicht leeren
  const b = parseAbschnitt("bewerbung", fd({}));
  assert.ok("daten" in b && !("anschreiben_dokument_id" in b.daten));
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

test("Archiv-Schalter und unbekannter Status", () => {
  assert.equal(leseTabelle({ archiv: "1" }).archiv, true);
  assert.equal(leseTabelle({}).archiv, false);
  assert.deepEqual(leseTabelle({ status: "xyz" }).status, []);
  const u = new URL(tabelleZuUrl(leseTabelle({ archiv: "1" })), "http://x");
  assert.equal(u.searchParams.get("archiv"), "1");
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

test("A8 datumDe: TT.MM.JJJJ über Intl, robust bei leer und Unsinn", async () => {
  const { datumDe } = await import("../lib/bewerbung.ts");
  assert.equal(datumDe("2026-11-09"), "09.11.2026");
  assert.equal(datumDe("2026-01-05T23:30:00+00:00"), "05.01.2026");
  assert.equal(datumDe(null), "");
  assert.equal(datumDe("kein datum"), "");
});

test("Gemeinsame Kalenderprüfung unterscheidet reine Daten von Zeitpunkten und prüft Schaltjahre", () => {
  for (const s of ["0001-01-01", "0096-02-29", "0099-12-31", "2000-02-29", "2026-11-16", "9999-12-31"]) assert.equal(datumOk(s), true, s);
  for (const s of ["0000-01-01", "1900-02-29", "2026-02-29", "2026-04-31", "2026-00-01", "2026-13-01", "2026-01-00",
    "2026-11-16T10:00", "2026-11-16\n", " 2026-11-16", "2026-1-01"]) assert.equal(datumOk(s), false, s);
});

test("Direkte Berliner Umrechnung lehnt kaputte Daten, Uhren und übersprungene Zeiten ab", () => {
  for (const s of ["2026-02-29T10:00", "2026-04-31T10:00", "2026-11-16T24:00", "2026-11-16T12:60",
    "2026-03-29T02:00", "2026-03-29T02:30", "2026-03-29T02:59", "2026-11-16", "2026-11-16T12:00Z"]) {
    assert.equal(berlinZuIso(s), null, s);
  }
});

test("Berliner Zeiten direkt vor und nach der Frühlingslücke bleiben richtig", () => {
  assert.equal(berlinZuIso("2026-03-29T01:59"), "2026-03-29T00:59:00.000Z");
  assert.equal(berlinZuIso("2026-03-29T03:00"), "2026-03-29T01:00:00.000Z");
  assert.equal(berlinZuIso(" 2026-07-15T10:00 "), "2026-07-15T08:00:00.000Z");
});

test("Doppelte Herbstzeit behält den zuvor verwendeten Winterzeit-Zeitpunkt", () => {
  assert.equal(berlinZuIso("2026-10-25T02:30"), "2026-10-25T01:30:00.000Z");
  const r = parseAbschnitt("interview", fd({ datum: "2026-10-25T02:30" }));
  assert.ok("daten" in r);
  assert.equal(r.daten.datum, "2026-10-25T01:30:00.000Z");
});

test("Interview-Formular gibt bei unmöglichen Zeiten den vorhandenen Datumsfehler zurück", () => {
  for (const datum of ["2026-03-29T02:30", "2026-11-16T24:00", "2026-02-29T12:00"]) {
    assert.deepEqual(parseAbschnitt("interview", fd({ datum })), { fehler: "Ungültiges Datum." });
  }
});

test("Dokument-Version und Tracker-Datum teilen Kalenderregeln, reine Daten werden nicht in Zeiten umgewandelt", () => {
  for (const datum of ["0096-02-29", "2024-02-29", "2026-02-29", "2026-11-16T10:00"]) {
    const tracker = parseAbschnitt("rahmen", fd({ starttermin: datum }));
    const dokument = pruefeDokument("testnutzer", "cv", "Test", datum, "testnutzer/test.pdf");
    assert.equal("daten" in tracker, "daten" in dokument, datum);
    if ("daten" in tracker) assert.equal(tracker.daten.starttermin, datum);
  }
});

test("Anrede am Kontakt: nur Frau, Herr, ohne", () => {
  assert.ok("fehler" in parseAbschnitt("person", fd({ name: "Eva Muster", anrede: "divers" })));
  const r = parseAbschnitt("person", fd({ name: "Eva Muster", anrede: "frau" }));
  assert.ok("daten" in r && r.daten.anrede === "frau");
});
