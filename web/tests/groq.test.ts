import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { erkenneFirmaTitel, PROMPT_FIRMA } from "../lib/groq.ts";

const antwort = (inhalt: unknown, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content: typeof inhalt === "string" ? inhalt : JSON.stringify(inhalt) } }] }), { status });
const fake = (r: Response | (() => never)) => {
  const aufrufe: { url: string; body: any }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    aufrufe.push({ url, body: JSON.parse(init.body as string) });
    if (typeof r === "function") r();
    return r as Response;
  }) as unknown as typeof fetch;
  return { f, aufrufe };
};

test("Prompt-Konstante gleicht scraper/ki_prompt_firma.md", () => {
  assert.equal(PROMPT_FIRMA.trim(), readFileSync(new URL("../../scraper/ki_prompt_firma.md", import.meta.url), "utf8").replace(/\r\n/g, "\n").trim());
});

test("gültige Antwort: Werte getrimmt, nur Anzeigentext als User-Inhalt", async () => {
  const { f, aufrufe } = fake(antwort({ firma: "  Acme GmbH ", titel: " Entwickler (m/w/d) " }));
  assert.deepEqual(await erkenneFirmaTitel("Anzeige", f, "k"), { firma: "Acme GmbH", titel: "Entwickler (m/w/d)" });
  const b = aufrufe[0].body;
  assert.equal(aufrufe.length, 1);
  assert.equal(b.model, "openai/gpt-oss-120b");
  assert.deepEqual(b.messages, [{ role: "system", content: PROMPT_FIRMA }, { role: "user", content: "Anzeige" }]);
  assert.deepEqual(b.response_format, { type: "json_object" });
});

test("Text wird auf 12.000 Zeichen gekürzt", async () => {
  const { f, aufrufe } = fake(antwort({ firma: "A", titel: "B" }));
  await erkenneFirmaTitel("x".repeat(20000), f, "k");
  assert.equal(aufrufe[0].body.messages[1].content.length, 12000);
});

test("429, Netzfehler, kaputtes JSON, fehlender Titel: null", async () => {
  assert.equal(await erkenneFirmaTitel("t", fake(antwort({}, 429)).f, "k"), null);
  assert.equal(await erkenneFirmaTitel("t", fake(() => { throw new Error("netz"); }).f, "k"), null);
  assert.equal(await erkenneFirmaTitel("t", fake(antwort("kein json")).f, "k"), null);
  assert.equal(await erkenneFirmaTitel("t", fake(antwort({ firma: "A", titel: null })).f, "k"), null);
  assert.equal(await erkenneFirmaTitel("t", fake(antwort({ firma: " ", titel: "B" })).f, "k"), null);
});

test("ohne Schlüssel: null ohne Aufruf", async () => {
  const { f, aufrufe } = fake(antwort({ firma: "A", titel: "B" }));
  assert.equal(await erkenneFirmaTitel("t", f, ""), null);
  assert.equal(aufrufe.length, 0);
});
