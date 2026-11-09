import { test } from "node:test";
import assert from "node:assert/strict";
import { darfEntmerken, darfZuruecknehmen } from "../lib/schalter.ts";

test("entmerken nur bei gemerkt", () => {
  assert.equal(darfEntmerken("gemerkt"), true);
  for (const s of ["beworben", "im_gespraech", null, undefined]) assert.equal(darfEntmerken(s), false);
});

test("zuruecknehmen nur bei beworben", () => {
  assert.equal(darfZuruecknehmen("beworben"), true);
  for (const s of ["gemerkt", "im_gespraech", null, undefined]) assert.equal(darfZuruecknehmen(s), false);
});
