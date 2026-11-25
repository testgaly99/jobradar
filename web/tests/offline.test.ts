import test from "node:test";
import assert from "node:assert/strict";
import { offlineSeit, bewerbenGesperrt, OFFLINE_GESPERRT } from "../lib/offline.ts";

test("offline nur bei geschlossener Stelle, Datum = Tag nach zuletzt gesehen", () => {
  assert.equal(offlineSeit({ status: "geschlossen", zuletzt_gesehen: "2026-11-24" }), "2026-11-25");
  assert.equal(offlineSeit({ status: "offen", zuletzt_gesehen: "2026-11-24" }), null);
  assert.equal(offlineSeit(null), null);
});

test("offlineSeit: Zeitstempel wird auf das Datum gekürzt, Monatswechsel stimmt", () => {
  assert.equal(offlineSeit({ status: "geschlossen", zuletzt_gesehen: "2026-11-30T08:15:00Z" }), "2026-12-01");
  assert.equal(offlineSeit({ status: "geschlossen", zuletzt_gesehen: null }), null);
});

test("Sperre nur für gemerkte, offline, ohne trotzdem", () => {
  assert.equal(bewerbenGesperrt("gemerkt", true, false), true);
  assert.equal(bewerbenGesperrt("gemerkt", true, true), false);
  assert.equal(bewerbenGesperrt("beworben", true, false), false);
  assert.equal(bewerbenGesperrt("gemerkt", false, false), false);
});

test("Hinweistext ist verbatim", () => {
  assert.equal(OFFLINE_GESPERRT, "Die Anzeige ist offline. Schon beworben? Dann „Trotzdem eintragen“.");
});
