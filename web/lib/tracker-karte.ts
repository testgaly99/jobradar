// Reine Kartenlogik des Trackers (ohne server-only, damit testbar).
import { STATUS_LABEL, istStatus, type Status } from "./bewerbung.ts";
import { gehaltText, naechsterTermin, tageSeit } from "./karte.ts";

export type Karte = {
  id: string; firma: string | null; titel: string | null; status: Status; ergebnis: string | null; interesse: number | null;
  beworben_am: string | null; erstellt_am: string; runde: number | null; kommentar: string | null; logo_url: string | null;
  gehalt: string | null; letzterSchritt: string; naechsterTermin: { datum: string; text: string } | null;
};
export type Ereignis = { datum: string; neuer_status: string | null };
export type Termin = { datum: string | null; aufgabe: string | null; aufgabe_frist: string | null };
type Zeile = {
  id: string; firma: string | null; titel: string | null; status: Status; erstellt_am: string; ergebnis?: string | null; interesse?: number | null;
  beworben_am?: string | null; runde?: number | null; kommentar?: string | null; naechster_schritt?: string | null; naechster_schritt_faellig?: string | null;
  angebot_fix?: string | null; gehalt_wunsch?: string | null; gehalt_spanne_anzeige?: string | null;
  jobs?: { steckbrief?: { gehalt?: never } | null; companies?: { logo_url?: string | null } | null } | null;
};

// PostgREST: 42703 = Spalte unbekannt (Postgres), PGRST204 = Spalte fehlt im Schema-Cache.
export const spaltenFehlen = (e: { code?: string; message?: string } | null): boolean =>
  !!e && (e.code === "42703" || e.code === "PGRST204");

export function baueKarte(a: Zeile, events: Ereignis[], interviews: Termin[], heute: string): Karte {
  const letzt = events.reduce<Ereignis | null>((m, e) => (!m || e.datum > m.datum ? e : m), null);
  const label = letzt?.neuer_status && istStatus(letzt.neuer_status) ? STATUS_LABEL[letzt.neuer_status] : "";
  const n = letzt ? tageSeit(events, a.erstellt_am, heute) : 0;
  const tage = n === 0 ? "heute" : n === 1 ? "vor 1 Tag" : `vor ${n} Tagen`;
  const termine = [
    { datum: a.naechster_schritt_faellig ?? null, text: a.naechster_schritt?.trim() || "Nächster Schritt" },
    ...interviews.flatMap((i) => [{ datum: i.datum, text: "Interview" }, { datum: i.aufgabe_frist, text: i.aufgabe?.trim() || "Aufgabe" }]),
  ];
  return {
    id: a.id, firma: a.firma, titel: a.titel, status: a.status, ergebnis: a.ergebnis ?? null, interesse: a.interesse ?? null,
    beworben_am: a.beworben_am ?? null, erstellt_am: a.erstellt_am, runde: a.runde ?? null, kommentar: a.kommentar ?? null,
    logo_url: a.jobs?.companies?.logo_url ?? null, gehalt: gehaltText(a, a.jobs?.steckbrief ?? null),
    letzterSchritt: letzt ? (label ? `${label} · ${tage}` : tage) : "", naechsterTermin: naechsterTermin(termine, heute),
  };
}
