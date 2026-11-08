import { test } from "node:test";
import assert from "node:assert/strict";
import { firmenFarbe } from "../lib/farbe.ts";

test("gleicher Name gibt gleiche Farbe, Gross-/Kleinschreibung egal", () => {
  assert.equal(firmenFarbe("SAP"), firmenFarbe(" sap "));
});
test("liefert gueltige HSL-Farbe mit Farbton 0-359", () => {
  const m = firmenFarbe("Siemens").match(/^hsl\((\d+), 65%, 45%\)$/);
  assert.ok(m && Number(m[1]) < 360);
});
test("verschiedene Firmen haben meist verschiedene Farben", () => {
  assert.notEqual(firmenFarbe("SAP"), firmenFarbe("Siemens"));
});
