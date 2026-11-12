// Reine Kartenlogik des Trackers (ohne server-only, damit testbar).
import { STATUS_LABEL, istStatus, type Status } from "./bewerbung.ts";
import { gehaltText, naechsterTermin, tageSeit } from "./karte.ts";

export type Karte = {
  id: string; firma: string | null; titel: string | null; status: Status; ergebnis: string | null; interesse: number | null;
  beworben_am: string | null; erstellt_am: string; runde: number | null; kommentar: string | null; logo_url: string | null;
  gehalt: string | null; letzterSchritt: string; naechsterTermin: { datum: string; text: string } | null;
  schrittFaellig: string | null; // naechster_schritt_faellig, auch wenn überfällig (Vorauswahl)
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
    schrittFaellig: a.naechster_schritt_faellig ?? null,
  };
}

// Board: sichtbare Spalten (abgeschlossen ist das Archiv) und Gruppierung in Server-Reihenfolge.
export const BOARD_SPALTEN = ["gemerkt", "beworben", "im_gespraech", "angebot"] as const satisfies readonly Status[];
export function nachSpalten(karten: Karte[]): Record<Status, Karte[]> {
  const g = { gemerkt: [], beworben: [], im_gespraech: [], angebot: [], abgeschlossen: [] } as Record<Status, Karte[]>;
  for (const k of karten) (g[k.status] ?? g.beworben).push(k); // alte „Eingang bestätigt“-Zeilen vor Migration 008
  return g;
}
// Geänderte Karte nach vorn: wie die Server-Sortierung "zuletzt geändert oben", sonst springt sie nach dem Neuladen.
export function karteAendern(karten: Karte[], id: string, patch: Partial<Karte>): Karte[] {
  const k = karten.find((x) => x.id === id);
  return k ? [{ ...k, ...patch }, ...karten.filter((x) => x.id !== id)] : karten;
}

// Tastatur-Ziehen: die Spalte links (-1) bzw. rechts (1) von der aktuellen, nach Lage sortiert; am Rand null.
export function naechsteSpalte<T>(spalten: { id: T; left: number }[], aktuell: T, richtung: 1 | -1): T | null {
  const ids = [...spalten].sort((a, b) => a.left - b.left).map((s) => s.id);
  const i = ids.indexOf(aktuell);
  return i < 0 ? null : ids[i + richtung] ?? null;
}

// Meine Bewerbungen: gewünschte id, wenn sichtbar; sonst frühestes Fälligkeitsdatum (bei Gleichstand die obere); sonst die oberste.
export function vorauswahl(karten: Karte[], gewuenscht: string | undefined): Karte | null {
  const treffer = gewuenscht ? karten.find((k) => k.id === gewuenscht) : undefined;
  if (treffer) return treffer;
  // Überfällige Schritte zählen mit (naechsterTermin kennt nur Künftiges), sie sind am dringendsten.
  const datum = (k: Karte) => [k.schrittFaellig, k.naechsterTermin?.datum].filter((d): d is string => !!d).sort()[0];
  let best: Karte | null = null;
  for (const k of karten) { const d = datum(k); if (d && (!best || d < datum(best)!)) best = k; }
  return best ?? karten[0] ?? null;
}
