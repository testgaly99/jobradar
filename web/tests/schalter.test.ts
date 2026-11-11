import { test } from "node:test";
import assert from "node:assert/strict";
import { darfEntmerken } from "../lib/schalter.ts";

test("entmerken nur bei gemerkt", () => {
  assert.equal(darfEntmerken("gemerkt"), true);
  for (const s of ["beworben", "im_gespraech", null, undefined]) assert.equal(darfEntmerken(s), false);
});
