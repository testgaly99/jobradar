import { test } from "node:test";
import assert from "node:assert/strict";
import { loeschMeldung, pruefeDokument } from "../lib/dokumente.ts";

const uid = "00000000-0000-4000-8000-000000000001";
const pfad = `${uid}/test-dokument.pdf`;
const pruefe = (art: unknown = "cv", name: unknown = "Version 1", datum: unknown = "2026-11-16", speicherpfad: unknown = pfad) =>
  pruefeDokument(uid, art, name, datum, speicherpfad);

test("Dokumentarten und bereinigter Versionsname ergeben die bisherigen Speicherfelder", () => {
  for (const art of ["cv", "anschreiben", "anlage"]) {
    assert.deepEqual(pruefe(art, "  Version 1 \n"), {
      daten: { art, name: "Version 1", version_datum: "2026-11-16", storage_pfad: pfad },
    });
  }
});

test("Versionsname: 1 bis 120 Zeichen nach Trimmen, innere Leerzeichen bleiben", () => {
  for (const name of ["A", "a".repeat(120), "CV  Produktmanagement"]) {
    assert.ok("daten" in pruefe("cv", `  ${name}  `));
  }
  for (const name of ["", " \n\t ", "a".repeat(121), null, 123, {}, ["CV"]]) {
    assert.deepEqual(pruefe("cv", name), { fehler: "Der Versionsname muss 1 bis 120 Zeichen lang sein." });
  }
});

test("Dokumentart wird exakt geprüft, auch bei unerwarteten Datentypen", () => {
  for (const art of ["CV", " cv", "anderes", "", null, 1, {}, ["cv"]]) {
    assert.deepEqual(pruefe(art), { fehler: "Ungültige Art." });
  }
});

test("Speicherpfad gehört genau dem angemeldeten Nutzer und enthält keine zwei Punkte", () => {
  for (const speicherpfad of ["", "fremd/test.pdf", `${uid}x/test.pdf`, `/${uid}/test.pdf`, `${uid}/../test.pdf`,
    `${uid}/version..pdf`, null, 1, {}, [pfad]]) {
    assert.deepEqual(pruefe("cv", "CV", "2026-11-16", speicherpfad), { fehler: "Ungültiger Speicherpfad." });
  }
  const speicherpfad = `${uid}/unterordner/CV.Version 2.docx`;
  const ergebnis = pruefe("anlage", "Anlage", "2026-11-16", speicherpfad);
  assert.ok("daten" in ergebnis);
  assert.equal(ergebnis.daten.storage_pfad, speicherpfad);
});

test("Gültige Kalendertage einschließlich Schaltjahren und Monatsenden bleiben zulässig", () => {
  for (const datum of ["2000-02-29", "2024-02-29", "2026-02-28", "2026-04-30", "2026-12-31", "2030-01-01"]) {
    const ergebnis = pruefe("cv", "CV", datum);
    assert.ok("daten" in ergebnis, datum);
    assert.equal(ergebnis.daten.version_datum, datum);
  }
});

test("Unmögliche Tage und abweichende Datumsformen liefern einen verständlichen Fehler", () => {
  for (const datum of ["2026-02-29", "2024-02-30", "1900-02-29", "2100-02-29", "2026-04-31", "2026-00-01",
    "2026-13-01", "2026-01-00", "2026-01-32", "0000-01-01", "2026-1-01", "26-11-16", "2026-11-16T00:00:00Z",
    " 2026-11-16", "2026-11-16\n", "", null, 20261116, {}, ["2026-11-16"]]) {
    assert.deepEqual(pruefe("cv", "CV", datum), { fehler: "Ungültiges Datum." }, String(datum));
  }
});

test("Bei mehreren Fehlern bleibt die bisherige Reihenfolge Art, Pfad, Name, Datum", () => {
  assert.deepEqual(pruefe("falsch", "", "falsch", "fremd"), { fehler: "Ungültige Art." });
  assert.deepEqual(pruefe("cv", "", "falsch", "fremd"), { fehler: "Ungültiger Speicherpfad." });
  assert.deepEqual(pruefe("cv", "", "falsch"), { fehler: "Der Versionsname muss 1 bis 120 Zeichen lang sein." });
});

test("Art der Anlage: nur bei Anlagen und nur Zeugnis, Zertifikat, Sonstiges", () => {
  const anlage = pruefeDokument(uid, "anlage", "Zeugnis A", "2026-11-16", pfad, "zeugnis");
  assert.ok("daten" in anlage && anlage.daten.anlage_art === "zeugnis");
  assert.deepEqual(pruefeDokument(uid, "anlage", "Foto", "2026-11-16", pfad, "foto"), { fehler: "Ungültige Art der Anlage." });
  assert.deepEqual(pruefeDokument(uid, "cv", "CV", "2026-11-16", pfad, "zeugnis"), { fehler: "Ungültige Art der Anlage." });
  assert.ok(!("anlage_art" in (pruefe("cv") as { daten: object }).daten));
});

test("Löschen einer noch verwendeten Datei meldet den Grund statt eines Fehlers", () => {
  assert.equal(loeschMeldung("23503"), "Dokument wird noch in einer Bewerbung verwendet.");
  assert.equal(loeschMeldung("XX000"), "Dokument konnte nicht gelöscht werden.");
});
