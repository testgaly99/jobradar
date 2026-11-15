import type { SupabaseClient } from "@supabase/supabase-js";
import type { Filter } from "./filter.ts";

export type RankingListe = { id: string; name: string; anzahl: number };
export type RankingKatalog = { listen: RankingListe[]; verfuegbar: boolean; fehler: string | null };
export type RankingZuordnung = {
  unternehmen: string; liste_id: string; name: string; jahr: number; rang: number | null; quelle_url: string; lizenz: string;
};
const SEITE = 500;
const fehlt = (code?: string) => ["PGRST202", "42883", "42P01"].includes(code ?? "");

// Die Anmeldung entscheidet vor jeder Abfrage. Gäste können Listenparameter auch per Hand in die Adresse schreiben.
export function rankingFilter(f: Filter, angemeldet: boolean): Filter {
  return {
    ...f, liste: angemeldet ? f.liste : [], volltext: angemeldet && f.volltext,
    sort: f.sort === "rang" && (!angemeldet || f.liste.length !== 1) ? "neu" : f.sort,
  };
}

export function rankingHinweis(f: Filter, katalog: RankingKatalog): string | null {
  if (katalog.fehler) return katalog.fehler;
  if (!f.liste.length) return null;
  if (!katalog.verfuegbar) return "Der Listenfilter ist noch nicht eingerichtet. Bitte setze den Listenfilter zurück.";
  if (f.liste.some((id) => !katalog.listen.some((l) => l.id === id)))
    return "Eine ausgewählte Liste ist nicht mehr verfügbar. Bitte setze den Listenfilter zurück.";
  return null;
}

export function rankingQuellUrl(wert: unknown): string | null {
  if (typeof wert !== "string" || wert.length > 2000 || /[\s\u0000-\u001f\u007f\\]/.test(wert)) return null;
  try {
    const url = new URL(wert);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export async function ladeRankingKatalog(sb: SupabaseClient, angemeldet: boolean): Promise<RankingKatalog> {
  if (!angemeldet) return { listen: [], verfuegbar: false, fehler: null };
  const listen: RankingListe[] = [];
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await sb.rpc("ranking_katalog").order("id").range(von, von + SEITE - 1);
    if (error) return { listen: [], verfuegbar: false, fehler: fehlt(error.code) ? null : "Ranglisten konnten nicht geladen werden." };
    const teil = (data ?? []) as RankingListe[];
    listen.push(...teil.map((l) => ({ ...l, anzahl: Number(l.anzahl) })));
    if (teil.length < SEITE) return { listen, verfuegbar: true, fehler: null };
  }
}

export async function ladeRankingZuordnungen(sb: SupabaseClient, angemeldet: boolean, firmen: string[]): Promise<{ zuordnungen: RankingZuordnung[]; fehler: string | null }> {
  const zuordnungen: RankingZuordnung[] = [];
  if (!angemeldet) return { zuordnungen, fehler: null };
  const namen = [...new Set(firmen)].filter(Boolean);
  for (let i = 0; i < namen.length; i += 40) {
    for (let von = 0; ; von += SEITE) {
      const { data, error } = await sb.rpc("ranking_zuordnungen", { p_firmen: namen.slice(i, i + 40) })
        .order("unternehmen").order("liste_id").range(von, von + SEITE - 1);
      if (error) return { zuordnungen: [], fehler: fehlt(error.code) ? null : "Ranglistenangaben konnten nicht geladen werden." };
      const teil = (data ?? []) as RankingZuordnung[];
      zuordnungen.push(...teil);
      if (teil.length < SEITE) break;
    }
  }
  return { zuordnungen, fehler: null };
}
