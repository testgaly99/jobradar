import test from "node:test";
import assert from "node:assert/strict";
import { istOeffentlich, ROBOTS } from "../lib/oeffentlich.ts";

test("istOeffentlich: nur Stellen, Rechtliches und Anmeldung", () => {
  for (const p of ["/", "/stellen", "/stellen/", "/stellen/Helsing%3A4711", "/impressum", "/datenschutz", "/login", "/auth/callback", "/auth/neues-passwort"])
    assert.equal(istOeffentlich(p), true, p);
  for (const p of ["/stellenx", "/bewerbungen", "/bewerbungen/kanban", "/bewerbung/3f2c", "/konto", "/admin/nutzer", "/export", "/dokumente", "/loginx"])
    assert.equal(istOeffentlich(p), false, p);
});

test("ROBOTS: noindex, nofollow, noarchive", () => {
  assert.equal(ROBOTS, "noindex, nofollow, noarchive");
});
