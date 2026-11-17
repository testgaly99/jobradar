import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { leseSteckbrief } from "../lib/stellendaten.ts";
import { leseKi } from "../lib/zusammenfassung.ts";

const beispiele = JSON.parse(readFileSync(new URL("../../tests/fixtures/stellendaten_vertrag.json", import.meta.url), "utf8")) as {
  steckbriefe: { name: string; roh: unknown; anzeige: unknown }[];
  steckbriefLeser: { name: string; roh: unknown; anzeige: unknown }[];
  kiBasis: Record<string, unknown>; kiAnzeige: Record<string, unknown>;
  kiFaelle: { name: string; aenderungen: Record<string, unknown>; normalisiert?: Record<string, unknown>;
    pythonGueltig: boolean; webGueltig: boolean; anzeigeAenderungen?: Record<string, unknown> }[];
};

for (const fall of [...beispiele.steckbriefe, ...beispiele.steckbriefLeser]) {
  test(`Gemeinsamer Steckbriefvertrag: ${fall.name}`, () => {
    const vorher = structuredClone(fall.roh);
    assert.deepEqual(leseSteckbrief(fall.roh), fall.anzeige);
    assert.deepEqual(fall.roh, vorher);
  });
}
for (const fall of beispiele.kiFaelle) {
  test(`Gemeinsamer KI-Vertrag: ${fall.name}`, () => {
    const roh = { ...structuredClone(beispiele.kiBasis), ...structuredClone(fall.aenderungen) };
    const vorher = structuredClone(roh);
    const erwartet = { ...beispiele.kiAnzeige, ...fall.anzeigeAenderungen };
    assert.deepEqual(leseKi(roh), fall.webGueltig ? erwartet : null);
    if (fall.pythonGueltig) {
      const geschrieben = { ...roh, ...fall.normalisiert };
      assert.deepEqual(leseKi(geschrieben), { ...erwartet, ...fall.normalisiert });
    }
    assert.deepEqual(roh, vorher);
  });
}
