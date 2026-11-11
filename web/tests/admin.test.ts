import { test } from "node:test";
import assert from "node:assert/strict";
import { istAdmin } from "../lib/admin.ts";

test("istAdmin", () => {
  assert.equal(istAdmin("Mark@X.de", "mark@x.de"), true);
  assert.equal(istAdmin("a@x.de", " b@x.de , a@x.de "), true);
  assert.equal(istAdmin("a@x.de", ""), false);
  assert.equal(istAdmin(null, "a@x.de"), false);
  assert.equal(istAdmin("a@x.de", undefined), false);
});
