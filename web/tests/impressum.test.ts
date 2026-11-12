import test from "node:test";
import assert from "node:assert/strict";
import { impressum } from "../lib/impressum.ts";

const voll = { IMPRESSUM_NAME: " A B ", IMPRESSUM_STRASSE: "Weg 1", IMPRESSUM_ORT: "12345 Ort", IMPRESSUM_EMAIL: "a@example.com" };

test("impressum: alle vier Werte, getrimmt", () => {
  assert.deepEqual(impressum(voll), { name: "A B", strasse: "Weg 1", ort: "12345 Ort", email: "a@example.com" });
});

test("impressum: fehlt einer oder ist leer → null", () => {
  assert.equal(impressum({ ...voll, IMPRESSUM_EMAIL: undefined }), null);
  assert.equal(impressum({ ...voll, IMPRESSUM_ORT: "  " }), null);
});
