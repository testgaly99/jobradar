import { test } from "node:test";
import assert from "node:assert/strict";
import { abgleich, cvTextBereinigen, gueltig, markierung, LABEL, type Ergebnis } from "../lib/cv-ergebnis.ts";

const liste = [{ id: "a1", text: "Erfahrung mit SQL", muss: true }, { id: "a2", text: "Englisch C1", muss: true },
  { id: "a3", text: "Power BI", muss: false }, { id: "a4", text: "Führerschein", muss: true }, { id: "a5", text: "Ungeprüft", muss: true }];
const ergebnis: Ergebnis = {
  empfohlen: ["cv1"], anforderungs_hash: "h1", cv_hashes: { cv1: "c1" },
  anforderungen: [
    { id: "a1", je_cv: { cv1: { farbe: "gruen", grund: "belegt", beleg: "SQL-Abfragen", begruendung: "" } } },
    { id: "a2", je_cv: { cv1: { farbe: "gelb", grund: "teilweise", beleg: "Englisch B2", begruendung: "B2 statt C1" } } },
    { id: "a3", je_cv: { cv1: { farbe: "gelb", grund: "nicht_belegt", beleg: null, begruendung: "noch nicht belegt" } } },
    { id: "a4", je_cv: { cv1: { farbe: "rot", grund: "nicht_erfuellt", beleg: "Führerschein nicht vorhanden", begruendung: "verneint" } } },
    { id: "a5", je_cv: { cv1: { farbe: "gelb", grund: "nicht_pruefbar", beleg: null, begruendung: "konnte nicht geprüft werden" } } },
  ],
};

test("gueltig nur bei gleichen Prüfsummen", () => {
  assert.equal(gueltig(ergebnis, "h1", { cv1: "c1" }), true);
  assert.equal(gueltig(ergebnis, "h2", { cv1: "c1" }), false);
  assert.equal(gueltig(ergebnis, "h1", { cv1: "neu" }), false);
  assert.equal(gueltig(ergebnis, "h1", { cv1: "c1", cv2: "c2" }), false);
  assert.equal(gueltig(null, "h1", { cv1: "c1" }), false);
});

test("markierung liefert für jede Farbe und jeden Grund das Label", () => {
  const erwartet: Record<string, [string, string]> = {
    "Erfahrung mit SQL": ["gruen", LABEL.gruen], "Englisch C1": ["gelb", LABEL.teilweise], "Power BI": ["gelb", LABEL.nicht_belegt],
    "Führerschein": ["rot", LABEL.rot], "Ungeprüft": ["gelb", LABEL.nicht_pruefbar],
  };
  for (const [punkt, [farbe, label]] of Object.entries(erwartet)) {
    const m = markierung(punkt, liste, ergebnis, "cv1", "CV Daten");
    assert.ok(m, punkt);
    assert.equal(m.farbe, farbe); assert.equal(m.label, label); assert.equal(m.cvName, "CV Daten");
  }
  assert.equal(markierung("Führerschein", liste, ergebnis, "cv1", "x")?.beleg, "Führerschein nicht vorhanden");
});

test("Punkt ohne passende Anforderung oder fremde CV-Version ergibt null", () => {
  assert.equal(markierung("Teamfähigkeit", liste, ergebnis, "cv1", "x"), null);
  assert.equal(markierung("Erfahrung mit SQL", liste, ergebnis, "cv2", "x"), null);
  assert.equal(markierung("Erfahrung mit SQL", liste, null, "cv1", "x"), null);
});

test("Label-Texte wie im Plan", () => {
  assert.deepEqual(LABEL, { gruen: "belegt", teilweise: "teilweise", nicht_belegt: "noch nicht belegt",
    nicht_pruefbar: "konnte nicht geprüft werden", rot: "nicht erfüllt" });
});

const cvs = [{ id: "cv2", name: "CV B", standard: true, hash: "c2" }, { id: "cv1", name: "CV A", standard: false, hash: "c1" }];
const zwei: Ergebnis = { ...ergebnis, empfohlen: ["cv1", "cv2"], cv_hashes: { cv1: "c1", cv2: "c2" },
  anforderungen: [{ id: "a1", je_cv: { cv1: ergebnis.anforderungen[0].je_cv.cv1, cv2: ergebnis.anforderungen[1].je_cv.cv1 } }] };

test("abgleich: Zustände ohne CV, ohne Abschnitt, ohne gültiges Ergebnis", () => {
  assert.equal(abgleich(liste, "h1", ergebnis, []), null);
  assert.deepEqual(abgleich([], "h1", ergebnis, cvs), { zustand: "kein_abschnitt" });
  assert.deepEqual(abgleich(liste, "h1", null, cvs), { zustand: "offen" });
  assert.deepEqual(abgleich(null, null, null, cvs), { zustand: "offen" });
  assert.deepEqual(abgleich(liste, "h1", zwei, [{ ...cvs[0], hash: null }, cvs[1]]), { zustand: "offen" });
});

test("abgleich: Standard-CV zuerst, je empfohlener CV eine Spalte mit Markierungen", () => {
  const a = abgleich(liste, "h1", zwei, cvs);
  assert.ok(a && a.zustand === "fertig");
  assert.deepEqual(a.spalten.map((s) => s.cv.name), ["CV B", "CV A"]);
  assert.equal(a.spalten[0].markierungen["Erfahrung mit SQL"].label, LABEL.teilweise);
  assert.equal(a.spalten[1].markierungen["Erfahrung mit SQL"].label, LABEL.gruen);
  assert.equal(a.spalten[1].markierungen["Englisch C1"], undefined);
});

test("cvTextBereinigen vereinheitlicht Zeilenenden und Ränder", () => {
  assert.equal(cvTextBereinigen("  SQL\r\nPython \r\n"), "SQL\nPython");
});
