// Reine Zugregeln des Trackers (Spec "Regeln im Detail" 1–4), ohne Next-Importe, damit testbar.
import { ERGEBNIS_LABEL, STATUS, type Status } from "./bewerbung.ts";

export const STATUS_RANG = Object.fromEntries(STATUS.map((s, i) => [s, i])) as Record<Status, number>;

export type ZugAlt = { status: Status; runde: number | null; ergebnis: string | null; beworben_am: string | null };
export type ZugPatch = { status: Status; runde?: number; ergebnis?: string | null; beworben_am?: string };

// Wer einmal beworben ist, war beworben: zurück auf "Gemerkt" geht nicht (Rückgängig direkt nach einem Zug bleibt erlaubt).
export const zurueckZuGemerkt = (von: Status, nach: Status) => nach === "gemerkt" && von !== "gemerkt";
export const GEMERKT_GESPERRT = "Nach einer Bewerbung geht es nicht zurück auf „Gemerkt“.";

export function zugPatch(alt: ZugAlt, ziel: { status: Status; ergebnis?: string | null }, heute: string): ZugPatch {
  const p: ZugPatch = { status: ziel.status };
  if (ziel.status === "abgeschlossen") {
    if (!ziel.ergebnis || !Object.hasOwn(ERGEBNIS_LABEL, ziel.ergebnis)) throw new Error("ergebnis");
    p.ergebnis = ziel.ergebnis;
  } else if (alt.ergebnis) p.ergebnis = null;
  if (ziel.status === "im_gespraech" && alt.runde == null) p.runde = 1;
  if (STATUS_RANG[ziel.status] >= STATUS_RANG.beworben && !alt.beworben_am) p.beworben_am = heute;
  return p;
}

export function rundePatch(runde: number | null, richtung: 1 | -1): { runde: number } | null {
  const neu = (runde ?? 0) + richtung;
  return neu >= 1 && neu <= 4 ? { runde: neu } : null;
}

export const rueckgaengigErlaubt = (zeitpunktIso: string, jetzt: Date): boolean => {
  const alter = jetzt.getTime() - Date.parse(zeitpunktIso);
  return alter >= 0 && alter < 10 * 60 * 1000;
};
