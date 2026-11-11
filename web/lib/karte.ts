// Reine Helfer für Bewerbungs-Karten (Gehalt, Tage seit, nächster Termin).
import { lokal } from "./filter.ts";

// Datumsteil in Ortszeit; reine Datumsstrings bleiben unverändert.
export const tagVon = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : lokal(new Date(s)));
export const tageZwischen = (von: string, bis: string) => Math.round((Date.parse(`${bis}T00:00:00Z`) - Date.parse(`${von}T00:00:00Z`)) / 864e5);

const fehlt = (s: string | null | undefined) => !s || !s.trim();
const zahl = new Intl.NumberFormat("de-DE");

type Gehalt = { min?: number | null; max?: number | null; waehrung?: string | null; zeitraum?: string | null };
export function gehaltText(
  a: { angebot_fix?: string | null; gehalt_wunsch?: string | null; gehalt_spanne_anzeige?: string | null },
  steckbrief: { gehalt?: Gehalt | null } | null,
): string | null {
  for (const s of [a.angebot_fix, a.gehalt_wunsch, a.gehalt_spanne_anzeige]) if (!fehlt(s)) return s!.trim();
  const g = steckbrief?.gehalt;
  const werte = [g?.min, g?.max].filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  if (!g || !werte.length) return null;
  const zahlen = werte.length === 2 && werte[0] !== werte[1] ? `${zahl.format(werte[0])}–${zahl.format(werte[1])}` : zahl.format(werte[0]);
  const w = ` ${!g.waehrung || g.waehrung === "EUR" ? "€" : g.waehrung}`;
  return `${zahlen}${w} / ${g.zeitraum === "Monat" ? "Monat" : "Jahr"}`;
}

export function tageSeit(events: { datum: string }[], erstellt_am: string, heute: string): number {
  const letzt = events.length ? events.map((e) => e.datum).reduce((a, b) => (a > b ? a : b)) : erstellt_am;
  return tageZwischen(tagVon(letzt), heute);
}

export function naechsterTermin(items: { datum: string | null; text: string }[], heute: string): { datum: string; text: string } | null {
  let best: { datum: string; text: string } | null = null;
  for (const i of items) {
    if (!i.datum || tagVon(i.datum) < heute) continue;
    if (!best || i.datum < best.datum) best = { datum: i.datum, text: i.text };
  }
  return best;
}
