import test from "node:test";
import assert from "node:assert/strict";
import { zugPatch, rundePatch, rueckgaengigErlaubt, STATUS_RANG } from "../lib/zug.ts";

const basis = { status: "gemerkt" as const, runde: null, ergebnis: null, beworben_am: null };

test("zugPatch: beworben_am nur wenn leer", () => {
  assert.deepEqual(zugPatch(basis, { status: "beworben" }, "2026-11-11"), { status: "beworben", beworben_am: "2026-11-11" });
  assert.deepEqual(zugPatch({ ...basis, beworben_am: "2026-10-01" }, { status: "beworben" }, "2026-11-11"), { status: "beworben" });
  assert.deepEqual(zugPatch(basis, { status: "gemerkt" }, "2026-11-11"), { status: "gemerkt" });
});

test("zugPatch: Runde 1 beim ersten Gespräch, sonst bleibt sie", () => {
  assert.deepEqual(zugPatch(basis, { status: "im_gespraech" }, "2026-11-11"), { status: "im_gespraech", runde: 1, beworben_am: "2026-11-11" });
  assert.deepEqual(zugPatch({ ...basis, runde: 3 }, { status: "im_gespraech" }, "2026-11-11"), { status: "im_gespraech", beworben_am: "2026-11-11" });
});

test("zugPatch: abgeschlossen verlangt Ergebnis", () => {
  assert.throws(() => zugPatch(basis, { status: "abgeschlossen" }, "2026-11-11"), /ergebnis/);
  assert.throws(() => zugPatch(basis, { status: "abgeschlossen", ergebnis: "quatsch" }, "2026-11-11"), /ergebnis/);
  assert.throws(() => zugPatch(basis, { status: "abgeschlossen", ergebnis: "constructor" }, "2026-11-11"), /ergebnis/);
  assert.deepEqual(zugPatch(basis, { status: "abgeschlossen", ergebnis: "absage" }, "2026-11-11"), { status: "abgeschlossen", ergebnis: "absage", beworben_am: "2026-11-11" });
});

test("zugPatch: Rückweg aus dem Archiv leert das Ergebnis", () => {
  const alt = { status: "abgeschlossen" as const, runde: 2, ergebnis: "absage", beworben_am: "2026-10-01" };
  assert.deepEqual(zugPatch(alt, { status: "im_gespraech" }, "2026-11-11"), { status: "im_gespraech", ergebnis: null });
});

test("rundePatch: 1..4, sonst nichts", () => {
  assert.equal(rundePatch(4, 1), null);
  assert.deepEqual(rundePatch(null, 1), { runde: 1 });
  assert.equal(rundePatch(1, -1), null);
  assert.deepEqual(rundePatch(2, -1), { runde: 1 });
  assert.equal(rundePatch(null, -1), null);
});

test("rueckgaengigErlaubt: jünger als 10 Minuten", () => {
  assert.equal(rueckgaengigErlaubt("2026-11-11T10:00:00Z", new Date("2026-11-11T10:09:59Z")), true);
  assert.equal(rueckgaengigErlaubt("2026-11-11T10:00:00Z", new Date("2026-11-11T10:10:01Z")), false);
  assert.equal(rueckgaengigErlaubt("kein datum", new Date("2026-11-11T10:00:00Z")), false);
});

test("STATUS_RANG", () => {
  assert.equal(STATUS_RANG.gemerkt, 0);
  assert.equal(STATUS_RANG.abgeschlossen, 5);
});
