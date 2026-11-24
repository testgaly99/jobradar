import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const t = JSON.parse(readFileSync(new URL("../lib/cv-einwilligung.json", import.meta.url), "utf8"));

// Q274: Jeder muss beim Upload lesen, dass eine KI den Lebenslauf ausliest, und welche.
test("Einwilligungstexte nennen KI, Art. 9 und Widerruf; nur der Admin-Text nennt Anthropic", () => {
  for (const k of ["admin", "browser"]) {
    assert.match(t[k].text, /von einer KI auslesen/);
    assert.match(t[k].text, /Art\. 9 DSGVO/);
    assert.match(t[k].text, /Widerruf jederzeit/);
  }
  assert.match(t.admin.text, /Claude von Anthropic \(USA\)/);
  assert.doesNotMatch(t.browser.text, /Anthropic|Claude/);
  assert.match(t.browser.text, /an keinen KI-Dienst/);
  assert.notEqual(t.admin.fassung, t.browser.fassung);
});
