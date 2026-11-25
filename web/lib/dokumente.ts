// Reine Prüfung der Dokumentangaben; Anmeldung und Datenbankrechte gelten zusätzlich.
import { datumOk } from "./bewerbung.ts";

const ARTEN = ["cv", "anschreiben", "anlage"];
export const ANLAGE_ARTEN: Record<string, string> = { zeugnis: "Zeugnis", zertifikat: "Zertifikat", sonstiges: "Sonstiges" };

// Q308: dieselben Arten erlaubt der Speicher (Migration 025). Der Typ kommt aus der Endung, nicht vom Browser:
// ein Browser ohne Office meldet .doc sonst ohne Typ, und der Speicher lehnt ab.
export const DATEIARTEN: Record<string, string> = {
  ".pdf": "application/pdf", ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
};

export function mimeTyp(name: string): string | null {
  const e = Object.keys(DATEIARTEN).find((x) => name.toLowerCase().endsWith(x));
  return e ? DATEIARTEN[e] : null;
}
type DokumentDaten = { art: string; name: string; version_datum: string; storage_pfad: string; anlage_art?: string };

export function pruefeDokument(uid: string, art: unknown, name: unknown, versionDatum: unknown, pfad: unknown, anlageArt?: unknown):
  { daten: DokumentDaten } | { fehler: string } {
  if (typeof art !== "string" || !ARTEN.includes(art)) return { fehler: "Ungültige Art." };
  if (typeof pfad !== "string" || !pfad.startsWith(`${uid}/`) || pfad.includes("..")) return { fehler: "Ungültiger Speicherpfad." };
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120) return { fehler: "Der Versionsname muss 1 bis 120 Zeichen lang sein." };
  if (typeof versionDatum !== "string" || versionDatum.length !== 10 || !datumOk(versionDatum)) return { fehler: "Ungültiges Datum." };
  const mitArt = anlageArt !== undefined && anlageArt !== null && anlageArt !== "";
  if (mitArt && (art !== "anlage" || typeof anlageArt !== "string" || !Object.hasOwn(ANLAGE_ARTEN, anlageArt))) return { fehler: "Ungültige Art der Anlage." };
  return { daten: { art, name: name.trim(), version_datum: versionDatum, storage_pfad: pfad, ...(mitArt ? { anlage_art: anlageArt as string } : {}) } };
}

// 23503 = Fremdschlüssel: Eine Bewerbung nutzt das Dokument noch (CV, Anschreiben oder angehakte Anlage).
export function loeschMeldung(code: string | undefined): string {
  return code === "23503" ? "Dokument wird noch in einer Bewerbung verwendet." : "Dokument konnte nicht gelöscht werden.";
}
