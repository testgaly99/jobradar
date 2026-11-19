import { test } from "node:test";
import assert from "node:assert/strict";
import { pruefeBriefkopf, pruefeVorlage } from "../lib/unterlagen.ts";

const form = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

test("Briefkopf: Name Pflicht, E-Mail-Format, alles getrimmt", () => {
  assert.ok("fehler" in pruefeBriefkopf(form({ name: "  " })));
  assert.ok("fehler" in pruefeBriefkopf(form({ name: "Max", email: "x" })));
  assert.deepEqual(pruefeBriefkopf(form({ name: " Max Beispiel ", strasse: " Musterweg 1 ", plz_ort: "80331 München ", email: " max@example.com ", telefon: "", linkedin: "" })), {
    daten: { name: "Max Beispiel", strasse: "Musterweg 1", plz_ort: "80331 München", telefon: null, email: "max@example.com", linkedin: null },
  });
});

test("Vorlage: Name und Text Pflicht, höchstens 20 000 Zeichen, leerer Betreff → Standard", () => {
  assert.deepEqual(pruefeVorlage("A", "B", "x".repeat(20001)), { fehler: "Vorlage ist zu lang (höchstens 20 000 Zeichen)." });
  assert.ok("fehler" in pruefeVorlage("A", "B", "  "));
  assert.ok("fehler" in pruefeVorlage(" ", "B", "Text"));
  assert.deepEqual(pruefeVorlage(" Standard ", "", "Text\n"), { daten: { name: "Standard", betreff: "Bewerbung als {{stelle}}", text: "Text" } });
  assert.ok("daten" in pruefeVorlage("A", "B", "x".repeat(20000)));
});
