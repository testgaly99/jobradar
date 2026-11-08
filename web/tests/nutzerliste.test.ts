import { test } from "node:test";
import assert from "node:assert/strict";
import { nutzerZeilen, entfernenErlaubt, selbstLoeschenErlaubt } from "../lib/nutzerliste.ts";

test("nutzerZeilen: Name, Datum, Sortierung", () => {
  const z = nutzerZeilen([
    { id: "3", email: "c@x.de", created_at: "2026-11-08T23:30:00Z" },
    { id: "2", email: "b@x.de", created_at: "2026-01-02T10:00:00Z", user_metadata: { name: "Bea" } },
    { id: "1", email: "a@x.de", created_at: "2026-01-01T10:00:00Z", user_metadata: { full_name: "Ann", name: "X" } },
  ]);
  assert.deepEqual(z.map((r) => r.id), ["1", "2", "3"]);
  assert.deepEqual(z.map((r) => r.name), ["Ann", "Bea", "–"]);
  assert.equal(z[2].dabeiSeit, "09.11.2026");
  assert.equal(z[2].email, "c@x.de");
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
