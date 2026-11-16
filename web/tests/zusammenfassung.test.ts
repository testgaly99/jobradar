import { test } from "node:test";
import assert from "node:assert/strict";
import { leseKi, voraussetzungen, type Ki } from "../lib/zusammenfassung.ts";

const gut: Ki = {
  aufgaben: ["APIs bauen", "Tests schreiben", "Code prüfen"], rahmen: ["Vollzeit", "Hybrid"],
  abschluss: "Studium Informatik o. ä.", erfahrung: null, muss: ["TypeScript"], benefits: ["4-Tage-Woche"], sprache: "de",
};

test("gültiges Objekt ergibt die Werte", () => {
  assert.deepEqual(leseKi(gut), gut);
  assert.deepEqual(leseKi({ ...gut, rahmen: [], muss: [], benefits: [], abschluss: null, sprache: "en" })?.sprache, "en");
});

test("Unbrauchbares ergibt null", () => {
  for (const roh of [
    null, undefined, "text", 42, [],
    { ...gut, aufgaben: undefined },
    { ...gut, aufgaben: ["a", "b"] },
    { ...gut, aufgaben: ["a", "b", "c", "d", "e", "f"] },
    { ...gut, aufgaben: ["a", 2, "c"] },
    { ...gut, aufgaben: ["a", "  ", "c"] },
    { ...gut, rahmen: ["1", "2", "3", "4", "5"] },
    { ...gut, muss: ["1", "2", "3", "4"] },
    { ...gut, muss: "TypeScript" },
    { ...gut, benefits: ["1", "2", "3"] },
    { ...gut, abschluss: 5 },
    { ...gut, abschluss: "" },
    { ...gut, erfahrung: undefined },
    { ...gut, sprache: "fr" },
  ]) assert.equal(leseKi(roh), null, JSON.stringify(roh));
});

test("Voraussetzungen: Abschluss, Erfahrung, dann Muss, ohne Lücken", () => {
  assert.deepEqual(voraussetzungen({ ...gut, erfahrung: "3 Jahre Backend", muss: ["TypeScript", "SQL"] }),
    ["Studium Informatik o. ä.", "3 Jahre Backend", "TypeScript", "SQL"]);
  assert.deepEqual(voraussetzungen({ ...gut, abschluss: null, muss: [] }), []);
});

test("Alle zurückgegebenen Listen sind von Eingabe und anderen Leseergebnissen unabhängig", () => {
  const roh: Ki = structuredClone(gut);
  const a = leseKi(roh)!, b = leseKi(roh)!;
  for (const feld of ["aufgaben", "rahmen", "muss", "benefits"] as const) {
    assert.notEqual(a[feld], roh[feld], feld);
    assert.notEqual(a[feld], b[feld], feld);
    const vorher = [...roh[feld]];
    a[feld].push("Nur in diesem Ergebnis");
    assert.deepEqual(roh[feld], vorher, feld);
    assert.deepEqual(b[feld], vorher, feld);
  }
  assert.deepEqual(leseKi(roh), gut);
});

test("Spätere Änderungen der Rohlisten verändern gelesene Anforderungen nicht", () => {
  const roh: Ki = structuredClone(gut);
  const gelesen = leseKi(roh)!;
  for (const feld of ["aufgaben", "rahmen", "muss", "benefits"] as const) roh[feld][0] = "Geändert";
  assert.deepEqual(gelesen, gut);
});

test("Auch bei gemeinsamem Eingabearray bleiben unterschiedliche Felder getrennt", () => {
  const gemeinsam = ["SQL"];
  const gelesen = leseKi({ ...gut, muss: gemeinsam, benefits: gemeinsam })!;
  gelesen.muss[0] = "Verändert";
  assert.deepEqual(gelesen.benefits, ["SQL"]);
  assert.deepEqual(gemeinsam, ["SQL"]);
});

test("Texte, Reihenfolge, Duplikate und vorhandene Grenzen bleiben erhalten", () => {
  for (const sprache of ["de", "en"]) {
    const roh = { aufgaben: ["  Erstens  ", "SQL", "SQL", "Viertens", "Fünftens"],
      rahmen: ["Eins", "Zwei", "Drei", "Vier"], abschluss: " Studium ", erfahrung: " 3 Jahre ",
      muss: ["Zuerst", "Danach", "Zum Schluss"], benefits: ["A", "B"], sprache, unbekannt: "nicht übernehmen" };
    const { unbekannt, ...erwartet } = roh;
    assert.deepEqual(leseKi(roh), erwartet);
    assert.deepEqual(voraussetzungen(leseKi(roh)!), [" Studium ", " 3 Jahre ", "Zuerst", "Danach", "Zum Schluss"]);
  }
  assert.deepEqual(leseKi({ ...gut, rahmen: [], muss: [], benefits: [], abschluss: null, erfahrung: null }),
    { ...gut, rahmen: [], muss: [], benefits: [], abschluss: null, erfahrung: null });
});

test("Leere oder lückenhafte Elemente sind in keiner Liste gültige Anforderungen", () => {
  for (const [feld, laenge] of [["aufgaben", 3], ["rahmen", 1], ["muss", 1], ["benefits", 1]] as const) {
    const loecher = new Array(laenge);
    assert.equal(leseKi({ ...gut, [feld]: loecher }), null, `${feld}: Löcher`);
    assert.equal(leseKi({ ...gut, [feld]: Array(laenge).fill(undefined) }), null, `${feld}: undefined`);
    assert.equal(leseKi({ ...gut, [feld]: Array(laenge).fill(" \n ") }), null, `${feld}: leer`);
  }
});

test("Schreibgeschützte Eingaben werden nur gelesen; Voraussetzungen liefern eine eigene Liste", () => {
  const roh = Object.freeze({ ...gut, aufgaben: Object.freeze([...gut.aufgaben]),
    rahmen: Object.freeze([...gut.rahmen]), muss: Object.freeze([...gut.muss]), benefits: Object.freeze([...gut.benefits]) });
  const gelesen = leseKi(roh)!;
  assert.deepEqual(gelesen, gut);
  const liste = voraussetzungen(gelesen);
  liste[0] = "Nur diese Ausgabe";
  assert.equal(gelesen.abschluss, gut.abschluss);
  assert.deepEqual(gelesen.muss, gut.muss);
});
