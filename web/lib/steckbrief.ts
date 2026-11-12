// Steckbrief einer Anzeige und die einstellbare Kurzbeschreibung der Stellenliste (rein, ohne Next-Importe).
import { levelText } from "./filter.ts";
import { datumDe } from "./bewerbung.ts";

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

export type Gehalt = { min: number; max: number; waehrung: "EUR" | "CHF"; zeitraum: "Jahr" | "Monat" | "Stunde" };
export type Steckbrief = {
  erfahrungJahre: number | null; sprachen: { sprache: string; niveau: string }[];
  gehalt: Gehalt | null; sicherheit: boolean;
};
export const LEERER_STECKBRIEF: Steckbrief = { erfahrungJahre: null, sprachen: [], gehalt: null, sicherheit: false };

const zahl = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x > 0;

// jsonb aus der Datenbank prüfen; alles Unbrauchbare wird zu "nicht vorhanden".
export function leseSteckbrief(x: unknown): Steckbrief {
  if (!x || typeof x !== "object") return LEERER_STECKBRIEF;
  const o = x as Record<string, unknown>;
  const g = o.gehalt as Record<string, unknown> | null | undefined;
  const gehaltOk = !!g && zahl(g.min) && zahl(g.max) && g.min <= g.max
    && (g.waehrung === "EUR" || g.waehrung === "CHF") && (g.zeitraum === "Jahr" || g.zeitraum === "Monat" || g.zeitraum === "Stunde");
  return {
    erfahrungJahre: zahl(o.erfahrung_jahre) ? o.erfahrung_jahre : null,
    sprachen: Array.isArray(o.sprachen)
      ? o.sprachen.filter((s): s is { sprache: string; niveau: string } => !!s && typeof s.sprache === "string" && typeof s.niveau === "string")
      : [],
    gehalt: gehaltOk ? (g as unknown as Gehalt) : null,
    sicherheit: o.sicherheitsueberpruefung === true,
  };
}

const tausender = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const kurz = (n: number) => (n % 1000 === 0 ? `${n / 1000}k` : tausender(n));

// "70–85k €", "90–110k CHF", "6.000 € / Monat". Nichts wird umgerechnet.
export function gehaltText(g: Gehalt): string {
  const w = g.waehrung === "EUR" ? "€" : "CHF";
  if (g.zeitraum === "Jahr") {
    const rund = g.min % 1000 === 0 && g.max % 1000 === 0;
    const spanne = g.min === g.max ? (rund ? kurz(g.min) : tausender(g.min))
      : rund ? `${g.min / 1000}–${g.max / 1000}k` : `${tausender(g.min)}–${tausender(g.max)}`;
    return `${spanne} ${w}`;
  }
  const spanne = g.min === g.max ? tausender(g.min) : `${tausender(g.min)}–${tausender(g.max)}`;
  return `${spanne} ${w} / ${g.zeitraum}`;
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
    case "level": { const l = bekannt(d.level); const j = d.steckbrief.erfahrungJahre; return l && (j ? `${l} (ab ${j} ${j === 1 ? "Jahr" : "Jahren"})` : levelText(l)); }
    case "modell": return bekannt(d.modell);
    case "vertrag": return bekannt(d.vertrag);
    case "ort": return bekannt(d.ort);
    case "online_seit": return d.erstmalsGesehen && `Online seit ${datumDe(d.erstmalsGesehen)}`;
    case "erfahrung": return d.steckbrief.erfahrungJahre ? `ab ${d.steckbrief.erfahrungJahre} Jahren Erfahrung` : null;
    case "gehalt": return d.steckbrief.gehalt ? gehaltText(d.steckbrief.gehalt) : null;
    case "sprachen": return d.steckbrief.sprachen.length ? d.steckbrief.sprachen.map((s) => `${s.sprache} ${s.niveau}`).join(", ") : null;
    case "sicherheit": return d.steckbrief.sicherheit ? "Sicherheitsüberprüfung" : null;
    case "branche": return d.branchen.length ? d.branchen.join(", ") : null;
  }
}

// Die gewählten Felder in fester Reihenfolge.
// Mit Jahren aus der Anzeige trägt die Stufe die Zahl ("Senior (ab 5 Jahren)"); die Erfahrung extra wäre dann doppelt.
export const kurzzeile = (d: KurzDaten, felder: Feld[]): Eintrag[] => {
  const doppelt = felder.includes("level") && !!bekannt(d.level) && !!d.steckbrief.erfahrungJahre;
  return felder.flatMap((feld) => {
    if (feld === "erfahrung" && doppelt) return [];
    const text = feldText(feld, d); return text ? [{ feld, text }] : [];
  });
};
