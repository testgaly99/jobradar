import { test } from "node:test";
import assert from "node:assert/strict";
import { aktualisieren, anleitung, browserAus } from "../lib/erweiterung-anleitung.ts";

test("Edge-Anleitung beginnt mit edge://extensions, Chrome mit chrome://extensions", () => {
  assert.ok(anleitung("edge")[0].includes("edge://extensions"));
  assert.ok(anleitung("chrome")[0].includes("chrome://extensions"));
  assert.ok(aktualisieren("edge").some((s) => s.includes("edge://extensions")));
});

test("Chrome-Anleitung nennt die echten Knopfnamen", () => {
  const text = anleitung("chrome").join(" ");
  for (const s of ["Entwicklermodus", "Entpackte Erweiterung laden", "jobradar-erweiterung", "Erweiterungsoptionen", "Verbinden"]) assert.ok(text.includes(s), s);
});

test("Am Handy genau ein Satz statt Anleitung", () => {
  assert.deepEqual(anleitung("mobil"), ["Nur am Computer mit Chrome oder Edge."]);
});

test("Browser aus dem User-Agent", () => {
  const win = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)";
  assert.equal(browserAus(`${win} Chrome/142.0.0.0 Safari/537.36`), "chrome");
  assert.equal(browserAus(`${win} Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0`), "edge");
  assert.equal(browserAus("Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/142.0 Mobile Safari/537.36"), "mobil");
  assert.equal(browserAus("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"), "mobil");
  assert.equal(browserAus("Mozilla/5.0 (Windows NT 10.0; rv:140.0) Gecko/20100101 Firefox/140.0"), "mobil"); // Firefox: Erweiterung gibt es nicht
  assert.equal(browserAus(null), "chrome");
});
