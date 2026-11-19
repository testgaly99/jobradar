import { test } from "node:test";
import assert from "node:assert/strict";
import { anredeText, claudeAuftrag, dateiname, datumText, fuelleVorlage, platzhalterWerte, quelleText } from "../lib/anschreiben.ts";

const AUFTRAG = "Passe dieses Anschreiben an die folgende Stelle an. Bleib bei meinem Stil, erfinde nichts über mich. Erstelle das Ergebnis als Word-Datei und als PDF im deutschen Briefformat (DIN 5008).";
const tag = new Date(2026, 10, 19);

test("Platzhalter: Groß/Klein egal, Leerzeichen innen erlaubt", () => {
  assert.equal(fuelleVorlage("Bei {{firma}} als {{ Stelle }}", { firma: "Beispiel AG", stelle: "Analyst" }).text, "Bei Beispiel AG als Analyst");
  assert.equal(fuelleVorlage("{{FIRMA}} {{firma}}", { firma: "X" }).text, "X X");
});

test("Fehlender Wert wird leer ersetzt und einmal gemeldet; unbekannter bleibt stehen", () => {
  assert.deepEqual(fuelleVorlage("Hallo {{ansprechpartner}} {{Ansprechpartner}}", {}), { text: "Hallo  ", ohneWert: ["ansprechpartner"], unbekannt: [] });
  assert.deepEqual(fuelleVorlage("{{gehalt}}", {}), { text: "{{gehalt}}", ohneWert: [], unbekannt: ["gehalt"] });
});

test("Anrede ohne Komma, Nachname = letztes Wort", () => {
  assert.equal(anredeText("frau", "Anna Maria Müller"), "Sehr geehrte Frau Müller");
  assert.equal(anredeText("herr", "Schmidt"), "Sehr geehrter Herr Schmidt");
  assert.equal(anredeText("ohne", "Anna Müller"), "Sehr geehrte Damen und Herren");
  assert.equal(anredeText("frau", ""), "Sehr geehrte Damen und Herren");
  assert.equal(anredeText(null, null), "Sehr geehrte Damen und Herren");
});

test("Quelle: Portale mit Namen, sonst Karriereseite, leer bleibt leer", () => {
  assert.equal(quelleText("https://www.linkedin.com/jobs/view/1/"), "LinkedIn");
  assert.equal(quelleText("de.indeed.com"), "Indeed");
  assert.equal(quelleText("stepstone.de"), "StepStone");
  assert.equal(quelleText("xing.com"), "XING");
  assert.equal(quelleText("glassdoor.de"), "Glassdoor");
  assert.equal(quelleText("boards.greenhouse.io"), "Ihre Karriereseite");
  assert.equal(quelleText(null), "");
  assert.equal(quelleText("  "), "");
});

test("Datum und Dateiname", () => {
  assert.equal(datumText(tag), "19. November 2026");
  assert.equal(dateiname("A/B & Co. Müller", tag, "pdf"), "Anschreiben_A-B_Co_Mueller_2026-11-19.pdf");
  assert.equal(dateiname(null, tag, "docx"), "Anschreiben_2026-11-19.docx");
});

test("Platzhalterwerte aus Bewerbung und Kontakt", () => {
  assert.deepEqual(platzhalterWerte({ firma: "Beispiel AG", titel: "Analyst", quelle: "xing.com" }, { name: "Eva Muster", anrede: "frau" }, tag), {
    firma: "Beispiel AG", stelle: "Analyst", ansprechpartner: "Eva Muster", anrede: "Sehr geehrte Frau Muster", quelle: "XING", datum: "19. November 2026",
  });
  const ohne = platzhalterWerte({ firma: null, titel: null, quelle: null }, null, tag);
  assert.equal(ohne.anrede, "Sehr geehrte Damen und Herren");
  assert.deepEqual(fuelleVorlage("{{firma}}{{ansprechpartner}}{{quelle}}", ohne).ohneWert, ["firma", "ansprechpartner", "quelle"]);
});

test("Claude-Auftrag: kurz als Link, lang über die Zwischenablage", () => {
  const kurz = claudeAuftrag({ briefkopf: "B", anschreiben: "A", anzeige: "Z" });
  assert.equal(kurz.art, "link");
  assert.ok(kurz.url.startsWith("https://claude.ai/new?q="));
  assert.ok(kurz.url.includes(encodeURIComponent(AUFTRAG)));
  const lang = claudeAuftrag({ briefkopf: "B", anschreiben: "x".repeat(7000), anzeige: "" });
  assert.equal(lang.art, "zwischenablage");
  assert.equal(lang.url, "https://claude.ai/new");
  assert.ok(lang.art === "zwischenablage" && lang.text.startsWith(AUFTRAG));
});
