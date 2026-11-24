// Plan 6a, Task 5: gespeichertes CV-Abgleich-Ergebnis prüfen und je Anzeigenpunkt eine Markierung bilden.
// Reine Funktionen ohne Datenbank; die Stellen- und Bewerbungsseite reichen nur eigene Ergebnisse herein.

export type Eintrag = { farbe: "gruen" | "gelb" | "rot"; grund: string; beleg: string | null; begruendung: string };
export type Ergebnis = {
  empfohlen: string[];
  anforderungs_hash: string;
  cv_hashes: Record<string, string>;
  anforderungen: { id: string; je_cv: Record<string, Eintrag> }[];
};
export type Anforderung = { id: string; text: string; muss: boolean };
export type Markierung = { farbe: Eintrag["farbe"]; label: string; beleg: string | null; begruendung: string; cvName: string };

export const LABEL = {
  gruen: "belegt",
  teilweise: "teilweise",
  nicht_belegt: "noch nicht belegt",
  nicht_pruefbar: "konnte nicht geprüft werden",
  rot: "nicht erfüllt",
} as const;

// Gültig nur, wenn Anzeige und alle CV-Fassungen noch dieselben sind (A11); eine neue oder entfernte CV-Version
// ändert die Vergleichsgrundlage ebenfalls.
export function gueltig(ergebnis: Ergebnis | null | undefined, anforderungsHash: string | null | undefined,
  cvHashes: Record<string, string>): boolean {
  if (!ergebnis || !anforderungsHash || ergebnis.anforderungs_hash !== anforderungsHash) return false;
  const a = Object.keys(ergebnis.cv_hashes ?? {}), b = Object.keys(cvHashes);
  return a.length === b.length && b.every((id) => ergebnis.cv_hashes[id] === cvHashes[id]);
}

function label(e: Eintrag): string {
  if (e.farbe === "gruen") return LABEL.gruen;
  if (e.farbe === "rot") return LABEL.rot;
  return e.grund === "teilweise" ? LABEL.teilweise : e.grund === "nicht_belegt" ? LABEL.nicht_belegt : LABEL.nicht_pruefbar;
}

// Zuordnung Anzeigenpunkt ↔ Anforderung über exakt gleichen Text (die Liste entsteht aus denselben Punkten).
export function markierung(punkt: string, liste: Anforderung[] | null | undefined, ergebnis: Ergebnis | null | undefined,
  cvId: string, cvName: string): Markierung | null {
  const anforderung = (liste ?? []).find((a) => a.text === punkt);
  const e = anforderung && ergebnis?.anforderungen.find((x) => x.id === anforderung.id)?.je_cv?.[cvId];
  if (!e || !["gruen", "gelb", "rot"].includes(e.farbe)) return null;
  return { farbe: e.farbe, label: label(e), beleg: e.beleg ?? null, begruendung: e.begruendung ?? "", cvName };
}
