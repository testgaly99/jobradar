import { test } from "node:test";
import assert from "node:assert/strict";
import { nutzerZeilen, entfernenErlaubt, selbstLoeschenErlaubt, begriffPruefen } from "../lib/nutzerliste.ts";

const g = { provider: "google" };

test("nutzerZeilen: Name, Datum, Sortierung", () => {
  const z = nutzerZeilen([
    { id: "3", email: "c@x.de", created_at: "2026-11-08T23:30:00Z", app_metadata: g },
    { id: "2", email: "b@x.de", created_at: "2026-01-02T10:00:00Z", app_metadata: g, user_metadata: { name: "Bea" } },
    { id: "1", email: "a@x.de", created_at: "2026-01-01T10:00:00Z", app_metadata: g, user_metadata: { full_name: "Ann", name: "X" } },
  ]);
  assert.deepEqual(z.map((r) => r.id), ["1", "2", "3"]);
  assert.deepEqual(z.map((r) => r.name), ["Ann", "Bea", ""]);
  assert.equal(z[2].dabeiSeit, "09.11.2026");
  assert.equal(z[2].email, "c@x.de");
});

test("nutzerZeilen: letzte Anmeldung und Google-Erkennung", () => {
  const z = nutzerZeilen([
    { id: "1", email: "a@x.de", created_at: "2026-01-01T10:00:00Z", last_sign_in_at: null, app_metadata: { provider: "email" }, user_metadata: { full_name: "Kein Google" } },
    { id: "2", email: "b@x.de", created_at: "2026-01-02T10:00:00Z", last_sign_in_at: "2026-11-08T23:30:00Z", app_metadata: g, user_metadata: { full_name: "Bea" } },
  ]);
  assert.equal(z[0].letzteAnmeldung, "nie");
  assert.equal(z[0].istGoogle, false);
  assert.equal(z[0].name, "");
  assert.equal(z[1].letzteAnmeldung, "09.11.2026");
  assert.equal(z[1].istGoogle, true);
  assert.equal(z[1].name, "Bea");
});

test("begriffPruefen: trimmt, 2-60 Zeichen", () => {
  assert.equal(begriffPruefen("  Remote  "), "Remote");
  assert.equal(begriffPruefen(" a "), null);
  assert.equal(begriffPruefen("x".repeat(61)), null);
  assert.equal(begriffPruefen("x".repeat(60)), "x".repeat(60));
});

test("entfernenErlaubt", () => {
  const b = { zielId: "t", zielEmail: "b@x.de", eigeneId: "e", adminEnv: "Admin@x.de" };
  assert.match(entfernenErlaubt({ ...b, zielId: "e" })!, /Admin-Konto/);
  assert.match(entfernenErlaubt({ ...b, zielEmail: "ADMIN@x.de" })!, /Admin-Konto/);
  assert.equal(entfernenErlaubt(b), null);
  for (const zielEmail of [undefined, null, ""]) assert.match(entfernenErlaubt({ ...b, zielEmail })!, /nichts gelöscht/);
});

test("selbstLoeschenErlaubt: ohne/leere ADMIN_EMAIL gesperrt, Admin gesperrt, sonst erlaubt", () => {
  assert.match(selbstLoeschenErlaubt({ istAdmin: false })!, /nicht möglich/);
  assert.match(selbstLoeschenErlaubt({ istAdmin: false, adminEnv: "  " })!, /nicht möglich/);
  assert.equal(selbstLoeschenErlaubt({ istAdmin: true, adminEnv: "a@x.de" }), "Das Admin-Konto kann nicht gelöscht werden.");
  assert.equal(selbstLoeschenErlaubt({ istAdmin: false, adminEnv: "a@x.de" }), null);
});
