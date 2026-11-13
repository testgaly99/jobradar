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
