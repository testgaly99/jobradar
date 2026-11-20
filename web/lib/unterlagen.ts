// Prüfung von Briefkopf und Anschreiben-Vorlagen; Anmeldung und Datenbankrechte (RLS) gelten zusätzlich.
import type { Briefkopf } from "./brief-datei.ts";

const FELDER = ["name", "strasse", "plz_ort", "telefon", "email", "linkedin"] as const;
export const MAX_VORLAGE = 20000;

export function pruefeBriefkopf(f: FormData): { daten: Briefkopf } | { fehler: string } {
  const daten = Object.fromEntries(FELDER.map((k) => [k, String(f.get(k) ?? "").trim() || null])) as Briefkopf;
  if (!daten.name) return { fehler: "Bitte gib deinen Namen ein." };
  if (FELDER.some((k) => (daten[k]?.length ?? 0) > 200)) return { fehler: "Ein Feld ist zu lang (höchstens 200 Zeichen)." };
  if (daten.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(daten.email)) return { fehler: "Bitte gib eine gültige E-Mail-Adresse ein." };
  return { daten };
}

export function pruefeVorlage(name: string, betreff: string, text: string):
  { daten: { name: string; betreff: string; text: string } } | { fehler: string } {
  if (!name.trim() || name.trim().length > 120) return { fehler: "Der Name muss 1 bis 120 Zeichen lang sein." };
  if (!text.trim()) return { fehler: "Bitte gib den Text der Vorlage ein." };
  if (text.trim().length > MAX_VORLAGE) return { fehler: "Vorlage ist zu lang (höchstens 20 000 Zeichen)." };
  if (betreff.trim().length > 300) return { fehler: "Der Betreff ist zu lang (höchstens 300 Zeichen)." };
  return { daten: { name: name.trim(), betreff: betreff.trim() || "Bewerbung als {{stelle}}", text: text.trim() } };
}
