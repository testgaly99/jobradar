// Bestehende strukturierte Stellenwerte, ohne Anzeige-, Netzwerk- oder Next.js-Abhängigkeiten.
export type Gehalt = { min: number; max: number; waehrung: "EUR" | "CHF"; zeitraum: "Jahr" | "Monat" | "Stunde" };
export type Steckbrief = {
  erfahrungJahre: number | null; sprachen: { sprache: string; niveau: string }[];
  gehalt: Gehalt | null; sicherheit: boolean;
};
const leererSteckbrief = (): Steckbrief => ({ erfahrungJahre: null, sprachen: [], gehalt: null, sicherheit: false });
// Kompatibler Vergleichswert für bestehende Importe; Leser liefern eigene Objekte.
export const LEERER_STECKBRIEF: Steckbrief = leererSteckbrief();

const zahl = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x > 0;
const objekt = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

// Nur das vorhandene Format prüfen. Keine Einheiten erraten oder Beträge umrechnen.
export function leseGehalt(x: unknown): Gehalt | null {
  if (!objekt(x) || !zahl(x.min) || !zahl(x.max) || x.min > x.max
    || (x.waehrung !== "EUR" && x.waehrung !== "CHF")
    || (x.zeitraum !== "Jahr" && x.zeitraum !== "Monat" && x.zeitraum !== "Stunde")) return null;
  return { min: x.min, max: x.max, waehrung: x.waehrung, zeitraum: x.zeitraum };
}

export function leseSteckbrief(x: unknown): Steckbrief {
  if (!objekt(x)) return leererSteckbrief();
  const jahre = x.erfahrung_jahre;
  return {
    erfahrungJahre: typeof jahre === "number" && Number.isFinite(jahre) && jahre >= 0 ? jahre : null,
    sprachen: Array.isArray(x.sprachen)
      ? x.sprachen.filter((s): s is { sprache: string; niveau: string } => objekt(s) && typeof s.sprache === "string" && typeof s.niveau === "string")
        .map(s => ({ sprache: s.sprache, niveau: s.niveau }))
      : [],
    gehalt: leseGehalt(x.gehalt),
    // false bedeutet weiterhin auch „nicht erkannt“, kein belegtes „nicht nötig“.
    sicherheit: x.sicherheitsueberpruefung === true,
  };
}
