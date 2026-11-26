import type { Status } from "./bewerbung.ts";
import { tagePlus } from "./filter.ts";

// Hinweis bei gesperrter Bewerbung: Text verbatim aus der Aufgabe.
export const OFFLINE_GESPERRT = "Die Anzeige ist offline. Schon beworben? Dann „Trotzdem eintragen“.";

// Datum, seit dem die Anzeige offline ist: Tag nach dem letzten Sehen (nur bei geschlossener Stelle).
export function offlineSeit(job: { status?: string | null; zuletzt_gesehen?: string | null } | null | undefined): string | null {
  if (!job || job.status !== "geschlossen" || !job.zuletzt_gesehen) return null;
  // zuletzt_gesehen kann ein Zeitstempel sein; nur das Datum (erste 10 Zeichen) zählt.
  return tagePlus(job.zuletzt_gesehen.slice(0, 10), 1);
}

// Bewerben ist nur gesperrt, solange die Stelle gemerkt (nicht schon beworben) und offline ist, außer man bestätigt "trotzdem".
export const bewerbenGesperrt = (status: Status, offline: boolean, trotzdem: boolean): boolean =>
  status === "gemerkt" && offline && !trotzdem;
