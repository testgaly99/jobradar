// Reine Prüfung der Dokumentangaben; Anmeldung und Datenbankrechte gelten zusätzlich.
import { datumOk } from "./bewerbung.ts";

const ARTEN = ["cv", "anschreiben", "anlage"];
type DokumentDaten = { art: string; name: string; version_datum: string; storage_pfad: string };

export function pruefeDokument(uid: string, art: unknown, name: unknown, versionDatum: unknown, pfad: unknown):
  { daten: DokumentDaten } | { fehler: string } {
  if (typeof art !== "string" || !ARTEN.includes(art)) return { fehler: "Ungültige Art." };
  if (typeof pfad !== "string" || !pfad.startsWith(`${uid}/`) || pfad.includes("..")) return { fehler: "Ungültiger Speicherpfad." };
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120) return { fehler: "Der Versionsname muss 1 bis 120 Zeichen lang sein." };
  if (typeof versionDatum !== "string" || versionDatum.length !== 10 || !datumOk(versionDatum)) return { fehler: "Ungültiges Datum." };
  return { daten: { art, name: name.trim(), version_datum: versionDatum, storage_pfad: pfad } };
}
