import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeLike } from "./bewerbung.ts";
export { aufBeworben } from "./bewerbung-schutz.ts";

export type JobZeile = { id: string; unternehmen: string | null; titel: string | null; url: string | null; ort: string | null; arbeitsmodell: string | null; text: string | null; abschnitte?: unknown };

export function snapshotAusJob(job: JobZeile) {
  let quelle = null;
  if (job.url) { try { quelle = new URL(job.url).hostname; } catch { /* ungültiger Link */ } }
  return {
    firma: job.unternehmen, titel: job.titel, link: job.url, quelle,
    standort: job.ort, praesenzmodell: job.arbeitsmodell, snapshot_text: job.text || null,
    ...(job.abschnitte ? { snapshot_abschnitte: job.abschnitte } : {}),
  };
}

export function originalSpalteFehlt(error: { code?: string } | null): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}

export async function findeBewerbungZumLink(sb: SupabaseClient, ownerId: string, link: string,
  { nurOhneJob, ohneId }: { nurOhneJob?: boolean; ohneId?: string } = {}) {
  const suche = (feld: "link" | "portal_link") => {
    let q = sb.from("applications").select("id").eq("owner_id", ownerId);
    if (ohneId) q = q.neq("id", ohneId);
    if (nurOhneJob) q = q.is("job_id", null);
    return q.eq(feld, link).order("id").limit(1).maybeSingle();
  };
  const direkt = await suche("link");
  if (direkt.data || direkt.error) return direkt;
  const portal = await suche("portal_link");
  return originalSpalteFehlt(portal.error) ? direkt : portal;
}

// Legt die Bewerbung zu einer Stelle an oder liefert die vorhandene (auch bei Doppelklick). Gibt die id oder einen Fehler zurück.
type AnlageErgebnis = { id: string; manuelleBewerbung?: true } | { fehler: true };

export async function anlegenAusJob(sb: SupabaseClient, job: JobZeile, ownerId: string, extra: { quelle?: string | null; text?: string | null; beworbenAm?: string } = {}): Promise<AnlageErgebnis> {
  const finde = async (): Promise<AnlageErgebnis | null> => {
    const verknuepft = await sb.from("applications").select("id").eq("owner_id", ownerId)
      .eq("job_id", job.id).limit(1).maybeSingle();
    if (verknuepft.error) return { fehler: true };
    if (verknuepft.data?.id) return { id: verknuepft.data.id };
    if (!job.url) return null;
    const manuell = await findeBewerbungZumLink(sb, ownerId, job.url, { nurOhneJob: true });
    if (manuell.error) return { fehler: true };
    return manuell.data?.id ? { id: manuell.data.id, manuelleBewerbung: true } : null;
  };
  const vorhanden = await finde();
  if (vorhanden) return vorhanden;
  // Gegliederte Anzeige mitkopieren, wenn es sie gibt. Eigene Abfrage: fehlt die Spalte (Migration 005 offen), kommt nur ein Fehler und wir kopieren nichts.
  const abschnitte = job.abschnitte ?? (await sb.from("jobs").select("abschnitte").eq("id", job.id).maybeSingle()).data?.abschnitte ?? null;
  const snapshot = snapshotAusJob({ ...job, abschnitte });
  const { data, error } = await sb.from("applications").insert({
    ...snapshot, job_id: job.id, quelle: extra.quelle || snapshot.quelle, snapshot_text: job.text || extra.text || null,
    ...(extra.beworbenAm ? { status: "beworben", beworben_am: extra.beworbenAm } : { status: "gemerkt" }),
  }).select("id").single();
  if (error?.code === "23505") { // Doppelklick: die Bewerbung existiert schon
    const dup = await finde();
    if (dup) return dup;
  }
  return error || !data ? { fehler: true } : { id: data.id };
}

// Wie oft hat sich der Nutzer bei dieser Firma beworben (ohne "gemerkt", Archiv zählt mit)? ohneId: die gerade offene Bewerbung.
// shortcut: Vergleich über den Firmennamen (Groß/klein egal); verschieden geschriebene Namen zählen getrennt, bis Firmen verknüpft sind (Phase 4).
export async function bewerbungenBei(sb: SupabaseClient, firma: string | null, ohneId?: string): Promise<number> {
  if (!firma?.trim()) return 0;
  let q = sb.from("applications").select("id", { count: "exact", head: true }).ilike("firma", escapeLike(firma.trim())).neq("status", "gemerkt");
  if (ohneId) q = q.neq("id", ohneId);
  return (await q).count ?? 0;
}

export const bewerbungenLink = (firma: string) => `/bewerbungen?firma=${encodeURIComponent(firma.trim())}&archiv=1`;
