// Whitelist-Häkchen (Q45–Q47): Eingabe der Konto-Seite prüfen. Bei angehakten Firmen blendet "Studium: nein" nichts aus.
export function whitelistEingabe(firma: unknown, wert: unknown): { firma: string; wert: boolean } | null {
  if (typeof firma !== "string" || (wert !== "an" && wert !== "aus")) return null;
  const f = firma.trim();
  return f.length >= 1 && f.length <= 200 ? { firma: f, wert: wert === "an" } : null;
}
