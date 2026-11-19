import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { whitelistEingabe } from "../lib/whitelist.ts";

test("whitelistEingabe: an/aus, Firmenname nur getrimmt", () => {
  assert.deepEqual(whitelistEingabe("Helsing", "an"), { firma: "Helsing", wert: true });
  assert.deepEqual(whitelistEingabe("Helsing", "aus"), { firma: "Helsing", wert: false });
  assert.deepEqual(whitelistEingabe(' A&B, "C" ', "an"), { firma: 'A&B, "C"', wert: true });
  assert.equal(whitelistEingabe("x".repeat(200), "an")?.firma.length, 200);
});

test("whitelistEingabe: ungültige Eingaben → null", () => {
  for (const [f, w] of [["", "an"], ["   ", "an"], ["x".repeat(201), "an"], [null, "an"], ["Helsing", "vielleicht"], ["Helsing", null]] as const) {
    assert.equal(whitelistEingabe(f, w), null, `${f}/${w}`);
  }
});

test("Server Action: nur Admin, Rückfall ohne Migration 011", () => {
  const a = readFileSync(new URL("../app/konto/actions.ts", import.meta.url), "utf8");
  const teil = a.slice(a.indexOf("export async function whitelistSetzen"));
  assert.match(teil, /if \(!n\?\.admin\) notFound\(\);/);
  assert.ok(teil.indexOf("notFound()") < teil.indexOf("createAdminClient()"), "Admin-Prüfung vor dem Service-Key");
  assert.match(teil, /PGRST202/);
  assert.ok(teil.includes("Migration 011 fehlt: bitte im Supabase SQL Editor einspielen."));
});
