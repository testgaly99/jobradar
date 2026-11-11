import { test } from "node:test";
import assert from "node:assert/strict";
import { darfEntmerken } from "../lib/schalter.ts";

test("entmerken nur bei gemerkt", () => {
  assert.equal(darfEntmerken("gemerkt"), true);
  for (const s of ["beworben", "im_gespraech", null, undefined]) assert.equal(darfEntmerken(s), false);
});

test("C1 hatEigeneEingaben: automatisch gefüllte Felder zählen nicht, eigene schon", async () => {
  const { hatEigeneEingaben } = await import("../lib/schalter.ts");
  const frisch = { firma: "SAP", titel: "Data", link: "https://x", quelle: "x", standort: "Berlin", snapshot_text: "…", status: "gemerkt", notizen: null, tags: [], interesse: null };
  assert.equal(hatEigeneEingaben(frisch, 0), false);
  assert.equal(hatEigeneEingaben({ ...frisch, notizen: "anrufen" }, 0), true);
  assert.equal(hatEigeneEingaben({ ...frisch, interesse: 4 }, 0), true);
  assert.equal(hatEigeneEingaben({ ...frisch, tags: ["top"] }, 0), true);
  assert.equal(hatEigeneEingaben({ ...frisch, notizen: "" }, 0), false);
  assert.equal(hatEigeneEingaben(frisch, 1), true); // Kontakt, Interview oder Verlaufsnotiz
});
