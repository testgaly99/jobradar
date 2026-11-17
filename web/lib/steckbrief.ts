// Steckbrief einer Anzeige und die einstellbare Kurzbeschreibung der Stellenliste (rein, ohne Next-Importe).
import { levelText } from "./filter.ts";
import { datumDe } from "./bewerbung.ts";
import type { Gehalt, Steckbrief } from "./stellendaten.ts";
export { leseSteckbrief, LEERER_STECKBRIEF } from "./stellendaten.ts";
export type { Gehalt, Steckbrief } from "./stellendaten.ts";

export const FELDER = ["groesse", "level", "modell", "vertrag", "ort", "online_seit", "erfahrung", "gehalt", "sprachen", "sicherheit", "branche"] as const;
export type Feld = (typeof FELDER)[number];
export const FELD_TITEL: Record<Feld, string> = {
  groesse: "Unternehmensgröße", level: "Erfahrungslevel", modell: "Arbeitsmodell", vertrag: "Vertragsart", ort: "Ort",
  online_seit: "Online seit", erfahrung: "Geforderte Erfahrung", gehalt: "Gehalt", sprachen: "Sprachen",
  sicherheit: "Sicherheitsüberprüfung", branche: "Branche",
};
export const STANDARD_FELDER: Feld[] = ["groesse", "level", "modell", "vertrag", "ort", "online_seit", "erfahrung", "gehalt", "branche"];

// Gespeicherte Auswahl (text[] aus listen_felder): ohne Zeile Standard, unbekannte Namen fallen weg, Reihenfolge ist fest.
export function waehleFelder(gespeichert: unknown): Feld[] {
  if (!Array.isArray(gespeichert)) return [...STANDARD_FELDER];
  return FELDER.filter((f) => gespeichert.includes(f));
}

const tausender = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const kurz = (n: number) => (n % 1000 === 0 ? `${n / 1000}k` : tausender(n));

// Gehalt wird überall als Jahresgehalt gezeigt: Monat x12, Stunde x2080 (40 h x 52 Wochen), dann mit "≈".
const JAHRES_FAKTOR = { Jahr: 1, Monat: 12, Stunde: 2080 } as const;
export const proJahr = (n: number, zeitraum?: string | null): number => Math.round(n * (JAHRES_FAKTOR[zeitraum as keyof typeof JAHRES_FAKTOR] ?? 1));
export const ca = (zeitraum?: string | null): string => (zeitraum === "Monat" || zeitraum === "Stunde" ? "≈ " : "");
export const UMGERECHNET_HINWEIS = "Umgerechnet auf ein Jahresgehalt (Monatsgehalt x 12, Stundenlohn x 2.080 = 40 Std. x 52 Wochen)";
export const istUmgerechnet = (text: string): boolean => text.startsWith("≈");

// "70–85k €", "90–110k CHF", "≈ 72k €" (aus Monatsgehalt).
export function gehaltText(g: Gehalt): string {
  const w = g.waehrung === "EUR" ? "€" : "CHF";
  const [min, max] = [proJahr(g.min, g.zeitraum), proJahr(g.max, g.zeitraum)];
  const rund = min % 1000 === 0 && max % 1000 === 0;
  const spanne = min === max ? (rund ? kurz(min) : tausender(min))
    : rund ? `${min / 1000}–${max / 1000}k` : `${tausender(min)}–${tausender(max)}`;
  return `${ca(g.zeitraum)}${spanne} ${w}`;
}

// Arbeitsmodell plus "Remote", wenn die Stelle remote ist und das Modell das nicht schon sagt.
export const modellText = (modell: string | null, remote: boolean | null): string | null => {
  const m = modell && modell.toLowerCase() !== "unbekannt" ? modell : null;
  return [m, remote && m !== "Remote" ? "Remote" : null].filter(Boolean).join(", ") || null;
};

const bekannt = (s: string | null | undefined) => (s && s.toLowerCase() !== "unbekannt" ? s : null);

export type KurzDaten = {
  groesse: string | null; level: string | null; modell: string | null; vertrag: string | null; ort: string | null;
  erstmalsGesehen: string | null; branchen: string[]; steckbrief: Steckbrief;
};
export type Eintrag = { feld: Feld; text: string };

// Text pro Feld oder null, wenn der Wert fehlt (dann entfällt das Feld still).
function feldText(f: Feld, d: KurzDaten): string | null {
  switch (f) {
    case "groesse": { const g = bekannt(d.groesse); return g && `${g} Mitarbeitende`; }
    case "level": { const l = bekannt(d.level); const j = d.steckbrief.erfahrungJahre; return l && (j != null ? `${l} (ab ${j} ${j === 1 ? "Jahr" : "Jahren"})` : levelText(l)); }
    case "modell": return bekannt(d.modell);
    case "vertrag": return bekannt(d.vertrag);
    case "ort": return bekannt(d.ort);
    case "online_seit": return d.erstmalsGesehen && `Online seit ${datumDe(d.erstmalsGesehen)}`;
    case "erfahrung": return d.steckbrief.erfahrungJahre != null ? `ab ${d.steckbrief.erfahrungJahre} Jahren Erfahrung` : null;
    case "gehalt": return d.steckbrief.gehalt ? gehaltText(d.steckbrief.gehalt) : null;
    case "sprachen": return d.steckbrief.sprachen.length ? d.steckbrief.sprachen.map((s) => `${s.sprache} ${s.niveau}`).join(", ") : null;
    case "sicherheit": return d.steckbrief.sicherheit ? "Sicherheitsüberprüfung" : null;
    case "branche": return d.branchen.length ? d.branchen.join(", ") : null;
  }
}

// Die gewählten Felder in fester Reihenfolge.
// Mit Jahren aus der Anzeige trägt die Stufe die Zahl ("Senior (ab 5 Jahren)"); die Erfahrung extra wäre dann doppelt.
export const kurzzeile = (d: KurzDaten, felder: Feld[]): Eintrag[] => {
  const doppelt = felder.includes("level") && !!bekannt(d.level) && d.steckbrief.erfahrungJahre != null;
  return felder.flatMap((feld) => {
    if (feld === "erfahrung" && doppelt) return [];
    const text = feldText(feld, d); return text ? [{ feld, text }] : [];
  });
};
