import { test } from "node:test";
import assert from "node:assert/strict";
import { textZuLang, MAX_TEXT } from "../lib/uebernahme.ts";

test("textZuLang: \r\n zählt einmal, Grenze 50.000", () => {
  assert.ok(!textZuLang("a\r\n".repeat(MAX_TEXT / 2)), "\r\n zählt als ein Zeichen");
  assert.ok(textZuLang("a".repeat(MAX_TEXT + 1)));
});
