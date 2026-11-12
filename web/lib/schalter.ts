// Entmerken löscht nur im Status gemerkt; ab beworben gibt es in der Stellenliste keinen Umschalter mehr.
export const darfEntmerken = (status: string | null | undefined) => status === "gemerkt";

// C1: Felder, die nur der Nutzer füllt (Merken setzt nur Firma, Titel, Link, Quelle, Standort, Präsenzmodell, Snapshot).
export const EIGENE_FELDER = [
  "anforderungen", "beworben_am", "bewerbungsweg", "referenznummer", "portal_hinweis", "cv_dokument_id", "anschreiben_dokument_id",
  "gehalt_spanne_anzeige", "gehalt_wunsch", "angebot_fix", "angebot_variabel", "angebot_urlaub", "angebot_benefits", "gehalt_aktuell_vergleich",
  "starttermin", "kuendigungsfrist", "referenzen", "ergebnis", "absagegrund", "feedback", "rueckzug_grund",
  "interesse", "tags", "notizen", "naechster_schritt", "naechster_schritt_faellig", "kommentar",
] as const;
// weitere = Anzahl Kontakte, Interviews und Verlaufsnotizen der Bewerbung.
export function hatEigeneEingaben(a: Record<string, unknown>, weitere: number): boolean {
  return weitere > 0 || EIGENE_FELDER.some((f) => {
    const v = a[f];
    return v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
  });
}
