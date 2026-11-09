import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type JobZeile = { id: string; unternehmen: string | null; titel: string | null; url: string | null; ort: string | null; arbeitsmodell: string | null; text: string | null; abschnitte?: unknown };

// Legt die Bewerbung zu einer Stelle an oder liefert die vorhandene (auch bei Doppelklick). Gibt die id oder einen Fehler zurück.
export async function anlegenAusJob(sb: SupabaseClient, job: JobZeile, extra: { quelle?: string | null; text?: string | null } = {}): Promise<{ id: string } | { fehler: true }> {
  const finde = async () => (await sb.from("applications").select("id").eq("job_id", job.id).limit(1).maybeSingle()).data?.id as string | undefined;
  const vorhanden = await finde();
  if (vorhanden) return { id: vorhanden };
  let quelle = extra.quelle ?? null;
  if (!quelle && job.url) { try { quelle = new URL(job.url).hostname; } catch { /* Link ungültig: ohne Quelle */ } }
  // Gegliederte Anzeige mitkopieren, wenn es sie gibt. Eigene Abfrage: fehlt die Spalte (Migration 005 offen), kommt nur ein Fehler und wir kopieren nichts.
  const abschnitte = job.abschnitte ?? (await sb.from("jobs").select("abschnitte").eq("id", job.id).maybeSingle()).data?.abschnitte ?? null;
  const { data, error } = await sb.from("applications").insert({
    job_id: job.id, firma: job.unternehmen, titel: job.titel, link: job.url, quelle,
    standort: job.ort, praesenzmodell: job.arbeitsmodell, snapshot_text: job.text || extra.text || null, status: "gemerkt",
    ...(abschnitte ? { snapshot_abschnitte: abschnitte } : {}),
  }).select("id").single();
  if (error?.code === "23505") { // Doppelklick: die Bewerbung existiert schon
    const dup = await finde();
    if (dup) return { id: dup };
  }
  return error || !data ? { fehler: true } : { id: data.id };
}
