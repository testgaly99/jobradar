// Reine Funktionen fürs Anschreiben: Platzhalter, Anrede, Quelle, Dateiname, Claude-Auftrag (ohne Browser testbar).

export type Werte = { firma: string; stelle: string; ansprechpartner: string; anrede: string; quelle: string; datum: string };

const NAMEN = ["firma", "stelle", "ansprechpartner", "anrede", "quelle", "datum"];
export const PLATZHALTER = NAMEN.map((n) => `{{${n}}}`);

export function fuelleVorlage(text: string, werte: Partial<Werte>): { text: string; ohneWert: string[]; unbekannt: string[] } {
  const ohneWert: string[] = [];
  const unbekannt: string[] = [];
  const merke = (liste: string[], n: string) => { if (!liste.includes(n)) liste.push(n); };
  const neu = text.replace(/\{\{\s*([^{}]*?)\s*\}\}/g, (ganz, roh: string) => {
    const n = roh.toLowerCase();
    if (!NAMEN.includes(n)) { merke(unbekannt, n); return ganz; }
    const w = werte[n as keyof Werte]?.trim();
    if (!w) { merke(ohneWert, n); return ""; }
    return w;
  });
  return { text: neu, ohneWert, unbekannt };
}

export function anredeText(anrede: string | null, name: string | null): string {
  const nachname = name?.trim().split(/\s+/).pop();
  if (nachname && anrede === "frau") return `Sehr geehrte Frau ${nachname}`;
  if (nachname && anrede === "herr") return `Sehr geehrter Herr ${nachname}`;
  return "Sehr geehrte Damen und Herren";
}

const PORTALE: [string, string][] = [["linkedin", "LinkedIn"], ["stepstone", "StepStone"], ["indeed", "Indeed"], ["xing", "XING"], ["glassdoor", "Glassdoor"]];

export function quelleText(quelle: string | null): string {
  const q = quelle?.trim().toLowerCase();
  if (!q) return "";
  return PORTALE.find(([k]) => q.includes(k))?.[1] ?? "Ihre Karriereseite";
}

export function datumText(d: Date): string {
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
}

const isoTag = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function platzhalterWerte(app: { firma: string | null; titel: string | null; quelle: string | null },
  kontakt: { name: string | null; anrede: string | null } | null, heute: Date): Werte {
  return {
    firma: app.firma?.trim() ?? "", stelle: app.titel?.trim() ?? "", ansprechpartner: kontakt?.name?.trim() ?? "",
    anrede: anredeText(kontakt?.anrede ?? null, kontakt?.name ?? null), quelle: quelleText(app.quelle), datum: datumText(heute),
  };
}

export function dateiname(firma: string | null, heute: Date, endung: "pdf" | "docx"): string {
  const f = (firma ?? "").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue").replace(/ß/g, "ss").replace(/\//g, "-").replace(/[^A-Za-z0-9-]+/g, "_").replace(/^_+|_+$/g, "");
  return `Anschreiben_${f ? `${f}_` : ""}${isoTag(heute)}.${endung}`;
}

export const AUFTRAG = "Passe dieses Anschreiben an die folgende Stelle an. Bleib bei meinem Stil, erfinde nichts über mich. Erstelle das Ergebnis als Word-Datei und als PDF im deutschen Briefformat (DIN 5008).";
const MAX_URL = 6000;

export function claudeAuftrag(o: { briefkopf: string; anschreiben: string; anzeige: string }):
  { art: "link"; url: string } | { art: "zwischenablage"; text: string; url: "https://claude.ai/new" } {
  const text = `${AUFTRAG}\n\nBriefkopf:\n${o.briefkopf}\n\nMein Anschreiben:\n${o.anschreiben}\n\nDie Stelle:\n${o.anzeige}`;
  const url = `https://claude.ai/new?q=${encodeURIComponent(text)}`;
  return url.length > MAX_URL ? { art: "zwischenablage", text, url: "https://claude.ai/new" } : { art: "link", url };
}

// Was Claude über die Stelle bekommt: Aufgaben/Anforderungen aus dem Snapshot, sonst der Auszug, dazu der Link.
const RELEVANT = /aufgab|anforder|profil|mitbring|qualifi|erwart|bring|kenntnis|t[äa]tigkeit/i;
export function anzeigeText(abschnitte: { titel: string; punkte: string[] }[] | null, anforderungen: string | null, link: string | null): string {
  const teile = (abschnitte ?? []).filter((a) => RELEVANT.test(a.titel) && a.punkte.length)
    .map((a) => `${a.titel}:\n${a.punkte.map((p) => `- ${p}`).join("\n")}`);
  const inhalt = teile.length ? teile.join("\n\n") : anforderungen?.trim() ?? "";
  return [link ? `Link: ${link}` : "", inhalt].filter(Boolean).join("\n\n");
}
