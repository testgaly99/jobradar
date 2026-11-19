import { test } from "node:test";
import assert from "node:assert/strict";
import { briefAus, briefDocx, briefPdf, textAusDocx, type Brief } from "../lib/brief-datei.ts";
import { platzhalterWerte } from "../lib/anschreiben.ts";

const kopf = { name: "Max Beispiel", strasse: "Musterweg 1", plz_ort: "80331 München", telefon: "", email: "max@example.com", linkedin: "" };
const tag = new Date(2026, 10, 19);
const brief: Brief = {
  absender: "Max Beispiel · Musterweg 1 · 80331 München", empfaenger: ["Beispiel AG", "z. Hd. Eva Muster"],
  ortDatum: "München, 19. November 2026", betreff: "Bewerbung als Analyst",
  text: `Sehr geehrte Frau Muster,\n\nerster Absatz.\n\nzweiter mit https://example.invalid/${"a".repeat(300)}\n\nMit freundlichen Grüßen`,
};

test("PDF: beginnt mit %PDF und ist nicht leer, auch mit langem Wort", async () => {
  const pdf = await briefPdf(brief);
  assert.equal(Buffer.from(pdf.subarray(0, 4)).toString(), "%PDF");
  assert.ok(pdf.length > 1000);
});

test("Word: ZIP-Datei, deren Text den Betreff enthält", async () => {
  const docx = await briefDocx(brief);
  assert.equal(Buffer.from(docx.subarray(0, 2)).toString(), "PK");
  const text = await textAusDocx(docx.buffer.slice(docx.byteOffset, docx.byteOffset + docx.byteLength) as ArrayBuffer);
  assert.ok(text.includes("Bewerbung als Analyst"));
  assert.ok(text.includes("zweiter mit"));
});

test("Brief aus Briefkopf und Werten: Ort ohne PLZ, Empfänger mit und ohne Ansprechpartner", () => {
  const mit = briefAus(kopf, { betreff: "B", text: "T" }, platzhalterWerte({ firma: "Beispiel AG", titel: "X", quelle: null }, { name: "Eva Muster", anrede: "frau" }, tag));
  assert.equal(mit.ortDatum, "München, 19. November 2026");
  assert.deepEqual(mit.empfaenger, ["Beispiel AG", "z. Hd. Eva Muster"]);
  assert.ok(mit.absender.includes("Max Beispiel") && mit.absender.includes("max@example.com"));
  const ohne = briefAus(kopf, { betreff: "B", text: "T" }, platzhalterWerte({ firma: "Beispiel AG", titel: "X", quelle: null }, null, tag));
  assert.equal(ohne.empfaenger.length, 1);
});
