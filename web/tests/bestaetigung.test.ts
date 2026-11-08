import { test } from "node:test";
import assert from "node:assert/strict";
import { bestaetigt } from "../lib/bestaetigung.ts";

test("bestaetigt", () => {
  assert.equal(bestaetigt("LÖSCHEN"), true);
  assert.equal(bestaetigt("  LÖSCHEN  "), true);
  for (const x of ["löschen", "LOESCHEN", "", null, undefined]) assert.equal(bestaetigt(x), false);
});
