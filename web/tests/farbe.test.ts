import { test } from "node:test";
import assert from "node:assert/strict";
import { firmenFarbe } from "../lib/farbe.ts";

test("gleicher Name gibt gleiche Farbe, Gross-/Kleinschreibung egal", () => {
  assert.equal(firmenFarbe("SAP"), firmenFarbe(" sap "));
});
test("liefert ganzzahligen Farbton 0-359", () => {
  const h = firmenFarbe("Siemens");
  assert.ok(Number.isInteger(h) && h >= 0 && h < 360);
});
test("verschiedene Firmen haben meist verschiedene Farben", () => {
  assert.notEqual(firmenFarbe("SAP"), firmenFarbe("Siemens"));
});
