import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { anzeigeLesenAnstossen } from "../lib/github-anstoss.ts";

type Aufruf = { url: string; init: RequestInit };
const fetchMit = (status: number, aufrufe: Aufruf[]) =>
  (async (url: string | URL | Request, init?: RequestInit) => { aufrufe.push({ url: String(url), init: init! }); return new Response(null, { status }); }) as typeof fetch;

test("ohne Schlüssel kein Aufruf", async () => {
  const aufrufe: Aufruf[] = [];
  assert.equal(await anzeigeLesenAnstossen({ env: {}, holen: fetchMit(204, aufrufe) }), false);
  assert.equal(aufrufe.length, 0);
});

test("mit Schlüssel: Workflow anzeige-lesen.yml auf main, ohne Adresse oder persönliche Daten", async () => {
  const aufrufe: Aufruf[] = [];
  const ok = await anzeigeLesenAnstossen({ env: { GITHUB_DISPATCH_TOKEN: "t0ken", GITHUB_REPO: "beispiel/repo" }, holen: fetchMit(204, aufrufe) });
  assert.equal(ok, true);
  assert.equal(aufrufe[0].url, "https://api.github.com/repos/beispiel/repo/actions/workflows/anzeige-lesen.yml/dispatches");
  assert.equal(aufrufe[0].init.method, "POST");
  assert.deepEqual(JSON.parse(String(aufrufe[0].init.body)), { ref: "main" });
  assert.equal((aufrufe[0].init.headers as Record<string, string>).Authorization, "Bearer t0ken");
});

test("Fehler von GitHub oder Netz werden geschluckt (Nachtlauf als Rückfall)", async () => {
  assert.equal(await anzeigeLesenAnstossen({ env: { GITHUB_DISPATCH_TOKEN: "t" }, holen: fetchMit(401, []) }), false);
  const kaputt = (async () => { throw new Error("Netz"); }) as typeof fetch;
  assert.equal(await anzeigeLesenAnstossen({ env: { GITHUB_DISPATCH_TOKEN: "t" }, holen: kaputt }), false);
});

test("Link-Import markiert Firmenseiten ohne Anzeigentext und stößt danach an", () => {
  const a = readFileSync(new URL("../app/bewerbungen/actions.ts", import.meta.url), "utf8");
  assert.match(a, /const nachSeite = !!seite && !ziel\.job && \(ausSeite \|\| !ziel\.text\);/);
  assert.match(a, /if \(nachSeite\) after\(\(\) => anzeigeLesenAnstossen\(\)\);/);
  const w = readFileSync(new URL("../../.github/workflows/anzeige-lesen.yml", import.meta.url), "utf8");
  assert.match(w, /workflow_dispatch:\s*\n(?!\s+inputs)/, "keine Eingaben: Adressen gehören nicht in öffentliche Protokolle");
  assert.match(w, /python -m scraper\.nachruesten/);
});
