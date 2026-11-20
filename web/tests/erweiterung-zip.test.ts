import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { packeErweiterung } from "../scripts/erweiterung-zip.mjs";
import version from "../lib/erweiterung-version.json" with { type: "json" };

function quelle() {
  const q = mkdtempSync(join(tmpdir(), "erweiterung-"));
  writeFileSync(join(q, "manifest.json"), JSON.stringify({ name: "Test", version: "1.2.3" }));
  writeFileSync(join(q, "kern.mjs"), "export const x = 1;");
  writeFileSync(join(q, "vertrag.test.mjs"), "// Test");
  mkdirSync(join(q, "fixtures")); writeFileSync(join(q, "fixtures", "seite.html"), "<p>x</p>");
  return q;
}

test("ZIP enthält Laufzeitdateien im Ordner jobradar-erweiterung, keine Tests und Fixtures", () => {
  const ziel = join(mkdtempSync(join(tmpdir(), "zip-")), "downloads", "jobradar-erweiterung.zip");
  const r = packeErweiterung(quelle(), ziel);
  assert.equal(r.version, "1.2.3");
  assert.deepEqual(r.dateien.sort(), ["jobradar-erweiterung/kern.mjs", "jobradar-erweiterung/manifest.json"]);
  const inhalt = unzipSync(readFileSync(ziel));
  assert.equal(new TextDecoder().decode(inhalt["jobradar-erweiterung/kern.mjs"]), "export const x = 1;");
});

test("fehlender Quellordner bricht mit klarer Meldung ab statt leerer ZIP", () => {
  assert.throws(() => packeErweiterung(join(tmpdir(), "gibt-es-nicht-123"), join(tmpdir(), "x.zip")),
    /Ordner browser-erweiterung\/chrome nicht gefunden – in Vercel ‚Include files outside the root directory‘ einschalten/);
});

test("Version auf der Konto-Seite = Version im manifest.json der Erweiterung", () => {
  const manifest = JSON.parse(readFileSync(new URL("../../browser-erweiterung/chrome/manifest.json", import.meta.url), "utf8"));
  assert.equal(version.version, manifest.version);
});
