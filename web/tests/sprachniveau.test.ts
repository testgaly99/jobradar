import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { STUFEN, deutschText, deutschWirksam, leseDeutsch, stufenRang } from "../lib/sprachniveau.ts";
import { filterZuUrl, leseFilter } from "../lib/filter.ts";
import { stellenAbfrage } from "../lib/stellen.ts";

test("Wortlaute für das Deutschniveau", () => {
  assert.equal(deutschText({ status: "pflicht", stufe: "C1", geschaetzt: true }), "Deutsch ≈ C1");
  assert.equal(deutschText({ status: "pflicht", stufe: "B2", geschaetzt: false }), "Deutsch B2");
  assert.equal(deutschText({ status: "vorteil", stufe: "B2–C1", geschaetzt: false }), "Deutsch von Vorteil (B2–C1)");
  assert.equal(deutschText({ status: "vorteil", stufe: null, geschaetzt: false }), "Deutsch von Vorteil");
  assert.equal(deutschText({ status: "ohne_niveau", stufe: null, geschaetzt: false }), "Deutsch: Niveau nicht angegeben");
  assert.equal(deutschText({ status: "keins", stufe: null, geschaetzt: false }), null);
});

test("leseDeutsch nimmt nur das gespeicherte Format", () => {
  assert.deepEqual(leseDeutsch({ status: "pflicht", stufe: "C1", geschaetzt: true }), { status: "pflicht", stufe: "C1", geschaetzt: true });
  assert.equal(leseDeutsch(null), null);
  assert.equal(leseDeutsch({ status: "pflicht", stufe: "X9", geschaetzt: false }), null);
  assert.equal(leseDeutsch({ status: "irgendwas" }), null);
  assert.deepEqual(leseDeutsch({ status: "vorteil", stufe: "B2–C1" }), { status: "vorteil", stufe: "B2–C1", geschaetzt: false });
});

test("Stufen und Rang wie in Python", () => {
  assert.deepEqual(STUFEN, ["A1", "A2", "B1", "B2", "C1", "C2", "Muttersprache"]);
  assert.equal(stufenRang("A1"), 1);
  assert.equal(stufenRang("B2"), 4);
  assert.equal(stufenRang("Muttersprache"), 7);
  assert.equal(stufenRang("alle"), null);
});

test("Filter liest und schreibt deutsch; Unsinn wird verworfen", () => {
  assert.equal(leseFilter({ deutsch: "B2" }).deutsch, "B2");
  assert.equal(leseFilter({ deutsch: "alle" }).deutsch, "alle");
  assert.equal(leseFilter({ deutsch: "X9" }).deutsch, "");
  assert.equal(leseFilter({}).deutsch, "");
  assert.equal(filterZuUrl({ ...leseFilter({}), deutsch: "C1" }), "/stellen?deutsch=C1");
});

test("Wirksame Stufe: Adresse vor gespeicherter Wahl, 'alle' schaltet aus, Gäste nie", () => {
  assert.equal(deutschWirksam("", "B2", true), "B2");
  assert.equal(deutschWirksam("C1", "B2", true), "C1");
  assert.equal(deutschWirksam("alle", "B2", true), "");
  assert.equal(deutschWirksam("", null, true), "");
  assert.equal(deutschWirksam("B2", "B2", false), "");
});

for (const mitListe of [false, true]) {
  test(`${mitListe ? "Ranking" : "Standard"}: Deutsch-Filter lässt Stellen ohne Stufe sichtbar`, async () => {
    const aufrufe: URL[] = [];
    const sb = createClient("https://datenbank.example.invalid", "test-ohne-zugangsdaten", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: async (input) => {
        aufrufe.push(new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url));
        return new Response("[]", { headers: { "Content-Type": "application/json" } });
      } },
    });
    const f = { ...leseFilter({}), liste: mitListe ? ["liste-a"] : [] };
    await stellenAbfrage(sb, { ...f, deutsch: "B2" });
    assert.equal(aufrufe.at(-1)!.searchParams.get("or"), "(deutsch_stufe.is.null,deutsch_stufe.lte.4)");
    await stellenAbfrage(sb, { ...f, deutsch: "" });
    assert.equal(aufrufe.at(-1)!.searchParams.get("or"), null);
    await stellenAbfrage(sb, { ...f, deutsch: "alle" });
    assert.equal(aufrufe.at(-1)!.searchParams.get("or"), null);
  });
}
