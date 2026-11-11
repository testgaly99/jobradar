import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeLike, type TabellenFilter } from "./bewerbung.ts";
import { heuteLokal } from "./filter.ts";
import { baueKarte, spaltenFehlen, type Ereignis, type Karte, type Termin } from "./tracker-karte.ts";

export { spaltenFehlen };
export type { Karte };

const BASIS = "id,firma,titel,status,ergebnis,interesse,beworben_am,erstellt_am,naechster_schritt,naechster_schritt_faellig,geaendert_am,angebot_fix,gehalt_wunsch,gehalt_spanne_anzeige";
const VOLL = `${BASIS},runde,kommentar,jobs(steckbrief,companies(logo_url))`;
const OHNE = `${BASIS},jobs(steckbrief)`;

async function inChunks<T>(sb: SupabaseClient, tabelle: string, spalten: string, ids: string[]): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await sb.from(tabelle).select(spalten).in("application_id", ids.slice(i, i + 100));
    out.push(...((data ?? []) as T[]));
  }
  return out;
}

export async function ladeKarten(sb: SupabaseClient, f: TabellenFilter & { archiv: boolean }): Promise<{ karten: Karte[]; ohneSpalten: boolean }> {
  const lade = (spalten: string) => {
    let q = sb.from("applications").select(spalten).order(f.sort, { ascending: f.dir === "asc", nullsFirst: false }).limit(500);
    q = f.archiv ? q.eq("status", "abgeschlossen") : q.neq("status", "abgeschlossen");
    if (f.status.length) q = q.in("status", f.status);
    if (f.firma) q = q.ilike("firma", `%${escapeLike(f.firma)}%`);
    if (f.interesse) q = q.gte("interesse", f.interesse);
    return q;
  };
  let { data, error } = await lade(VOLL);
  const ohneSpalten = spaltenFehlen(error);
  if (ohneSpalten) ({ data, error } = await lade(OHNE));
  if (error) return { karten: [], ohneSpalten };
  const zeilen = (data ?? []) as unknown as { id: string }[];
  const ids = zeilen.map((z) => z.id);
  const [events, interviews] = await Promise.all([
    inChunks<Ereignis & { application_id: string }>(sb, "application_events", "id,application_id,datum,neuer_status,notiz", ids),
    inChunks<Termin & { application_id: string }>(sb, "interviews", "application_id,datum,aufgabe,aufgabe_frist", ids),
  ]);
  const heute = heuteLokal();
  const karten = zeilen.map((z) => baueKarte(z as never, events.filter((e) => e.application_id === z.id), interviews.filter((i) => i.application_id === z.id), heute));
  return { karten, ohneSpalten };
}
