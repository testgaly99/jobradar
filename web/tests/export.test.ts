import { test } from "node:test";
import assert from "node:assert/strict";
import { bewerbungenCsv, csvDatei, csvFeld, dateiname, interviewText, kontaktText, linkFeld } from "../lib/export.ts";

test("csvFeld: Quoting", () => {
  assert.equal(csvFeld("a"), "a");
  assert.equal(csvFeld("a;b"), '"a;b"');
  assert.equal(csvFeld('sag "hi"'), '"sag ""hi"""');
  assert.equal(csvFeld("x\ny"), '"x\ny"');
  assert.equal(csvFeld("x\ry"), '"x\ry"');
});

test("csvFeld: null, Zahl, Array, Objekt", () => {
  assert.equal(csvFeld(null), "");
  assert.equal(csvFeld(undefined), "");
  assert.equal(csvFeld(4), "4");
  assert.equal(csvFeld(-1), "-1");
  assert.equal(csvFeld(["a", "b"]), "a, b");
  assert.equal(csvFeld(true), "true");
  assert.equal(csvFeld({ a: 1 }), '"{""a"":1}"');
});

test("csvFeld: Formel-Schutz", () => {
  for (const s of ["=1+1", "+1", "-1", "@x", "\tx"]) assert.equal(csvFeld(s)[0] === '"' ? csvFeld(s)[1] : csvFeld(s)[0], "'");
  assert.equal(csvFeld("\rx"), "\"'\rx\"");
  assert.equal(csvFeld("a=b"), "a=b");
});

test("csvDatei: BOM, Kopfzeile, CRLF, Semikolon", () => {
  assert.equal(csvDatei(["a", "b"], [["1", null], ["x;y", 2]]), "\uFEFFa;b\r\n1;\r\n\"x;y\";2\r\n");
});

test("Link: http(s) wird HYPERLINK-Formel", () => {
  assert.equal(csvFeld(linkFeld("https://example.com/job?id=1")), '"=HYPERLINK(""https://example.com/job?id=1"")"');
  assert.equal(csvFeld(linkFeld("http://a.de")), '"=HYPERLINK(""http://a.de"")"');
});

test("Link: javascript:, =cmd, ungültig bleiben geschützter Text", () => {
  assert.equal(csvFeld(linkFeld("javascript:alert(1)")), "javascript:alert(1)");
  assert.equal(csvFeld(linkFeld("=cmd|' /C calc'!A0")), "'=cmd|' /C calc'!A0");
  assert.equal(csvFeld(linkFeld("keine url")), "keine url");
  assert.equal(csvFeld(linkFeld(null)), "");
  assert.equal(csvFeld(linkFeld("ftp://x.de/a")), "ftp://x.de/a");
});

test("Link: Anführungszeichen in der URL verdoppelt", () => {
  const f = linkFeld('https://x.de/a"b') as { text: string };
  assert.equal(f.text, '=HYPERLINK("https://x.de/a""b")');
});

test("Link: über 255 Zeichen als Klartext", () => {
  const lang = "https://x.de/" + "a".repeat(250);
  assert.equal(linkFeld(lang), lang);
  assert.notEqual(linkFeld("https://x.de/" + "a".repeat(200)), "https://x.de/" + "a".repeat(200));
});

test("Kontakte und Interviews: Text je Eintrag", () => {
  assert.equal(kontaktText({ name: "Anna", rolle: "HR", email: "a@x.de", telefon: "123" }), "Anna (HR), a@x.de, 123");
  assert.equal(kontaktText({ name: "Bob", rolle: null, email: null, telefon: "5" }), "Bob, 5");
  assert.equal(interviewText({ datum: "2026-11-08T09:30:00Z", format: "Video", teilnehmer: "Chef" }), "08.11.2026 10:30 Video – Chef");
  assert.equal(interviewText({ datum: "2026-07-01T10:00:00Z", format: null, teilnehmer: null }), "01.07.2026 12:00");
});

test("bewerbungenCsv: eine Zeile, Status deutsch, Aggregation, Dokumentnamen", () => {
  const t = bewerbungenCsv(
    [{ id: "a1", firma: "ACME", titel: "PM", status: "im_gespraech", link: "https://acme.de/j", cv_dokument_id: "d1", beworben_am: "2026-11-08", ergebnis: "absage", tags: ["x", "y"] }],
    [{ application_id: "a1", name: "Anna", rolle: "HR" }, { application_id: "a1", name: "Bob", email: "b@x.de" }, { application_id: "zz", name: "Fremd" }],
    [{ application_id: "a1", datum: "2026-11-09T09:00:00Z", format: "Video", teilnehmer: "Chef" }, { application_id: "a1", datum: "2026-11-08T09:00:00Z", format: "Tel", teilnehmer: null }],
    [{ id: "d1", name: "CV v3" }],
  );
  const z = t.split("\r\n");
  assert.equal(z.length, 3); // Kopf, 1 Zeile, Rest leer
  assert.ok(z[0].startsWith("\uFEFFFirma;Titel;Status;Link;Standort;"));
  assert.ok(z[0].endsWith(";Kontakte;Interviews"));
  assert.ok(z[1].startsWith('ACME;PM;Im Gespräch;"=HYPERLINK(""https://acme.de/j"")";'));
  assert.ok(z[1].includes(";CV v3;"));
  assert.ok(z[1].includes(";08.11.2026;"));
  assert.ok(z[1].includes(";Absage;"));
  assert.ok(z[1].includes(";x, y;"));
  assert.ok(z[1].endsWith(";Anna (HR) | Bob, b@x.de;08.11.2026 10:00 Tel | 09.11.2026 10:00 Video – Chef"));
  assert.ok(!z[1].includes("Fremd"));
  assert.equal(z[1].split(";").length >= 37, true);
});

test("leerer Export: Kopfzeile bleibt", () => {
  const t = bewerbungenCsv([], [], [], []);
  assert.ok(t.startsWith("\uFEFFFirma;Titel;Status;Link;Standort;"));
  assert.equal(t.split("\r\n").length, 2);
});

test("dateiname bereinigen", () => {
  assert.equal(dateiname("Lebenslauf Müller (v2).pdf"), "Lebenslauf_M_ller__v2_.pdf");
  assert.equal(dateiname("../../etc/passwd"), ".._.._etc_passwd");
  assert.equal(dateiname("a".repeat(300) + ".pdf").length, 100);
  assert.equal(dateiname(""), "datei");
});
