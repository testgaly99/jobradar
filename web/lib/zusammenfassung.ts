// KI-Zusammenfassung einer Anzeige (jobs.ki, geschrieben von scraper/ki.py) prüfen und ordnen (rein, ohne Next-Importe).
export type Ki = {
  aufgaben: string[]; rahmen: string[]; abschluss: string | null; erfahrung: string | null;
  muss: string[]; benefits: string[]; sprache: "de" | "en";
};

const text = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";
// Die Kopie macht auch Array-Lücken als undefined für die Prüfung sichtbar.
const liste = (x: unknown, lo: number, hi: number): x is string[] =>
  Array.isArray(x) && x.length >= lo && x.length <= hi && [...x].every(text);
const textOderNull = (x: unknown): x is string | null => x === null || text(x);

// Gleiche Grenzen wie die Prüfung im Scraper; alles andere gilt als "keine Zusammenfassung".
export function leseKi(roh: unknown): Ki | null {
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) return null;
  const o = roh as Record<string, unknown>;
  if (!liste(o.aufgaben, 3, 5) || !liste(o.rahmen, 0, 4) || !liste(o.muss, 0, 3) || !liste(o.benefits, 0, 2)
    || !textOderNull(o.abschluss) || !textOderNull(o.erfahrung) || (o.sprache !== "de" && o.sprache !== "en")) return null;
  return {
    aufgaben: [...o.aufgaben], rahmen: [...o.rahmen], abschluss: o.abschluss, erfahrung: o.erfahrung,
    muss: [...o.muss], benefits: [...o.benefits], sprache: o.sprache,
  };
}

// "Das bringst du mit" in fester Reihenfolge: Abschluss, Erfahrung, dann die übrigen Muss-Punkte.
export const voraussetzungen = (k: Ki): string[] =>
  [k.abschluss, k.erfahrung, ...k.muss].filter((x): x is string => x !== null);
