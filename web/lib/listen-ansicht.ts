import type { SupabaseClient } from "@supabase/supabase-js";
import { RANKING_KATEGORIEN, filterZuUrl, type Filter, type Richtung } from "./filter.ts";
import { ladeRankingZuordnungen, type RankingZuordnung } from "./rankings.ts";
import { stellenFilter } from "./stellen.ts";
import { leseFilter } from "./filter.ts";
import { passungVerfuegbar } from "./passung.ts";
import { rankingFilter } from "./rankings.ts";

// Kategorie -> Listen in fester Reihenfolge. Die Kategorie ist nur Ordnungshilfe; unbekannte Listen folgen danach nach Name.
export const LISTEN_REIHENFOLGE: Record<string, string[]> = { "Börsennotiert": ["dax", "mdax", "sdax", "tecdax"] };

export type Kachel = { firma: string; logo: string | null; rang: number | null; stellen: number };
export type ListeBlock = { id: string; name: string; kacheln: Kachel[] };

const SEITE = 1000;
const UNBEKANNT = 99; // groesse_rang (Migration 010): 0 klein ... 3 groß, 99 unbekannt

export function gruppiere(
  zuordnungen: RankingZuordnung[], stellenJeFirma: Map<string, number>, groesseRang: Map<string, number>,
  logos: Map<string, string>, rangliste: string, listenKategorie: Map<string, string>, richtung: Richtung = "ab",
): ListeBlock[] {
  const u = richtung === "auf" ? -1 : 1; // dreht nur den Vergleich innerhalb eines Blocks
  const gr = (f: string) => { const g = groesseRang.get(f); return g === undefined || g === UNBEKANNT ? -1 : g; }; // -1 = zuletzt
  const nachListe = new Map<string, { name: string; kacheln: Kachel[] }>();
  for (const z of zuordnungen) {
    const stellen = stellenJeFirma.get(z.unternehmen) ?? 0;
    if (stellen < 1 || (rangliste !== "alle" && z.liste_id !== rangliste)) continue;
    const b = nachListe.get(z.liste_id) ?? { name: z.name, kacheln: [] };
    if (!b.kacheln.some((k) => k.firma === z.unternehmen))
      b.kacheln.push({ firma: z.unternehmen, logo: logos.get(z.unternehmen) ?? null, rang: z.rang, stellen });
    nachListe.set(z.liste_id, b);
  }
  const katPos = (id: string) => { const i = RANKING_KATEGORIEN.indexOf(listenKategorie.get(id) as typeof RANKING_KATEGORIEN[number]); return i < 0 ? RANKING_KATEGORIEN.length : i; };
  const listPos = (id: string) => { const i = (LISTEN_REIHENFOLGE[listenKategorie.get(id) ?? ""] ?? []).indexOf(id); return i < 0 ? Infinity : i; };
  return [...nachListe].map(([id, b]) => ({ id, name: b.name, kacheln: b.kacheln.sort((a, c) =>
      a.rang !== null && c.rang !== null ? u * (a.rang - c.rang) || a.firma.localeCompare(c.firma, "de")
      : a.rang !== null ? -1 : c.rang !== null ? 1
      : gr(a.firma) < 0 || gr(c.firma) < 0 ? gr(c.firma) - gr(a.firma) || a.firma.localeCompare(c.firma, "de") // unbekannte Größe immer hinten
      : u * (gr(c.firma) - gr(a.firma)) || a.firma.localeCompare(c.firma, "de")) }))
    .sort((a, c) => katPos(a.id) - katPos(c.id) || listPos(a.id) - listPos(c.id) || a.name.localeCompare(c.name, "de"));
}

const FEHLER = "Die Listenansicht konnte nicht geladen werden.";

export async function ladeListenAnsicht(sb: SupabaseClient, f: Filter, rangliste: string): Promise<{ bloecke: ListeBlock[]; fehler: string | null }> {
  // Gleiche Filter wie die Stellenliste (stellenFilter), nur Spalte unternehmen, alle Seiten. Sortierung "passung" würde die View brauchen.
  const stellenJeFirma = new Map<string, number>();
  const zaehlF = { ...f, sort: "neu" as const };
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await stellenFilter(sb, zaehlF, { tabelle: "unternehmen,companies!inner(aktiv,groesse_klasse,kategorie)", rpc: "unternehmen" })
      .order("id").range(von, von + SEITE - 1);
    if (error) return { bloecke: [], fehler: FEHLER };
    const teil = (data ?? []) as unknown as { unternehmen: string }[];
    for (const j of teil) stellenJeFirma.set(j.unternehmen, (stellenJeFirma.get(j.unternehmen) ?? 0) + 1);
    if (teil.length < SEITE) break;
  }
  const firmen = [...stellenJeFirma.keys()];
  const firmaDaten = async () => {
    const groesse = new Map<string, number>(); const logos = new Map<string, string>();
    for (let i = 0; i < firmen.length; i += 40) {
      const { data, error } = await sb.from("companies").select("name,logo_url,groesse_rang").in("name", firmen.slice(i, i + 40));
      if (error) return null;
      for (const c of (data ?? []) as { name: string; logo_url: string | null; groesse_rang: number | null }[]) {
        if (c.groesse_rang !== null) groesse.set(c.name, c.groesse_rang);
        if (c.logo_url) logos.set(c.name, c.logo_url);
      }
    }
    return { groesse, logos };
  };
  // Drei voneinander unabhaengige Abfragen gleichzeitig.
  const [{ zuordnungen, fehler }, ld, fd] = await Promise.all([ladeRankingZuordnungen(sb, true, firmen), sb.from("ranking_listen").select("id,kategorie"), firmaDaten()]);
  if (fehler) return { bloecke: [], fehler };
  if (ld.error || !fd) return { bloecke: [], fehler: FEHLER };
  const listenKategorie = new Map<string, string>();
  for (const l of (ld.data ?? []) as { id: string; kategorie: string | null }[]) if (l.kategorie) listenKategorie.set(l.id, l.kategorie);
  return { bloecke: gruppiere(zuordnungen, stellenJeFirma, fd.groesse, fd.logos, rangliste, listenKategorie, f.richtung), fehler: null };
}

const MAX_FIRMA_STELLEN = 100;

// Stellen einer Firma unter den aktuellen Filtern (query = Adressteil nach "?"); nur fuer Angemeldete. Nach Passung, sonst neueste zuerst.
export async function firmenStellenMit(sb: SupabaseClient, nutzer: { admin: boolean } | null, firma: unknown, query: unknown):
  Promise<{ stellen: { id: string; titel: string; ort: string | null }[]; alle?: string } | { fehler: string }> {
  if (!nutzer) return { fehler: "Bitte anmelden." };
  if (typeof firma !== "string" || !firma || firma.length > 200 || typeof query !== "string" || query.length > 4000) return { fehler: "Ungültige Anfrage." };
  const u = new URLSearchParams(query);
  const params: Record<string, string[]> = {};
  for (const k of new Set(u.keys())) params[k] = u.getAll(k);
  const f = rankingFilter(leseFilter(params), true);
  f.sort = (await passungVerfuegbar(sb, nutzer)) ? "passung" : "neu"; f.richtung = "ab";
  const q = stellenFilter(sb, f, { tabelle: "id,titel,ort,companies!inner(aktiv,groesse_klasse,kategorie)", rpc: "id,titel,ort" }).eq("unternehmen", firma);
  const { data, error } = await (f.sort === "passung" ? q.order("passung_sortwert", { ascending: true, nullsFirst: false }) : q)
    .order("erstmals_gesehen", { ascending: false }).order("id").limit(MAX_FIRMA_STELLEN + 1); // eine mehr: zeigt, ob es weitere gibt
  if (error) return { fehler: "Stellen konnten nicht geladen werden." };
  const zeilen = (data ?? []) as unknown as { id: string; titel: string; ort: string | null }[];
  const stellen = zeilen.slice(0, MAX_FIRMA_STELLEN).map((j) => ({ id: j.id, titel: j.titel, ort: j.ort }));
  return zeilen.length > MAX_FIRMA_STELLEN ? { stellen, alle: filterZuUrl({ ...f, firma: [firma], seite: 1 }) } : { stellen };
}
