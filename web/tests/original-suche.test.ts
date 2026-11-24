import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { aehnlichkeit, ausTabTitel, normTitelStreng, vergleiche } from "../lib/original-suche.ts";

type Vergleichsfall = {
  fall: string;
  titel: string;
  ort: string | null;
  kandidaten: { titel: string; ort: string | null; firma?: string }[];
  erwartet: { art: string; indizes: number[] };
};

type TabFall = {
  host: string;
  tab_titel: string;
  firma: string | null;
  titel: string | null;
};

const vergleichsfaelle: Vergleichsfall[] = JSON.parse(
  readFileSync(new URL("../../tests/fixtures/titel-vergleich.json", import.meta.url), "utf8"),
);
for (const { fall, titel, ort, kandidaten, erwartet } of vergleichsfaelle) {
  test(fall, () => {
    const ergebnis = vergleiche(titel, ort, kandidaten);
    assert.equal(ergebnis.art, erwartet.art);
    const treffer = ergebnis.art === "eindeutig" ? [ergebnis.treffer]
      : ergebnis.art === "auswahl" ? ergebnis.treffer : [];
    assert.deepEqual(treffer.map((kandidat) => kandidaten.indexOf(kandidat)), erwartet.indizes);
  });
}

test("Titel normalisieren", () => {
  assert.equal(normTitelStreng(" Développeur*in – C++ (m/w/d) "), "développeur c++");
});

test("Ähnlichkeit zählt gemeinsame Wörter bezogen auf die kürzere Wortmenge ohne Füllwörter", () => {
  assert.equal(aehnlichkeit("Data Analyst", "Data Analyst Controlling (m/w/d)"), 1);
  assert.equal(aehnlichkeit("Head of Data and Analytics", "Data Analytics"), 1);
  assert.equal(aehnlichkeit("Data Engineer", "Data Analyst"), 0.5);
  for (const fuellwort of "und and of für for the der die das im in m w d".split(" ")) {
    assert.equal(aehnlichkeit(`Sales ${fuellwort}`, `Finance ${fuellwort}`), 0);
  }
  assert.equal(aehnlichkeit("Data Data Analyst", "Analyst Data"), 1);
  assert.equal(aehnlichkeit("", ""), 0);
});

// Synthetische Formate. Die echten Indeed-Tab-Titel aus Task 0 stehen noch aus.
const tabFaelle: TabFall[] = JSON.parse(
  readFileSync(new URL("../../tests/fixtures/tab-titel.json", import.meta.url), "utf8"),
);
for (const { host, tab_titel, firma, titel } of tabFaelle) {
  test(`Synthetischer Tab-Titel: ${host} / ${tab_titel}`, () => {
    assert.deepEqual(ausTabTitel(tab_titel, host), firma && titel ? { firma, titel } : {});
  });
}
