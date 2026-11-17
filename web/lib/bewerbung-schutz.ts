import type { SupabaseClient } from "@supabase/supabase-js";
import { beworbenPatch } from "./bewerbung.ts";
import { darfEntmerken, hatEigeneEingaben } from "./schalter.ts";

// Keine Next-/Umgebungsimporte: derselbe Datenbankablauf wird von der angemeldeten Aktion und Tests verwendet.
export type EntmerkenErgebnis = { art: "fertig" } | { art: "fehler" } | { art: "eigene_eingaben"; id: string };

export async function entmerkenMit(sb: SupabaseClient, jobId: string): Promise<EntmerkenErgebnis> {
  const { data: a, error } = await sb.from("applications").select("*").eq("job_id", jobId).limit(1).maybeSingle();
  if (error) return { art: "fehler" };
  if (!a || !darfEntmerken(a.status)) return { art: "fertig" };
  const anzahl = { count: "exact", head: true } as const;
  const ergebnisse = await Promise.all([
    sb.from("contacts").select("id", anzahl).eq("application_id", a.id),
    sb.from("interviews").select("id", anzahl).eq("application_id", a.id),
    sb.from("application_events").select("id", anzahl).eq("application_id", a.id).is("neuer_status", null),
  ]);
  if (ergebnisse.some(r => r.error || !Number.isSafeInteger(r.count) || r.count! < 0)) return { art: "fehler" };
  if (hatEigeneEingaben(a, ergebnisse.reduce((sum, r) => sum + r.count!, 0))) {
    return { art: "eigene_eingaben", id: a.id };
  }
  const { error: loeschfehler } = await sb.from("applications").delete().eq("id", a.id).eq("status", "gemerkt");
  return { art: loeschfehler ? "fehler" : "fertig" };
}

export async function aufBeworben(sb: SupabaseClient, id: string, heute: string): Promise<boolean> {
  const { data: a, error } = await sb.from("applications").select("status,beworben_am").eq("id", id).maybeSingle();
  if (error || !a) return false;
  const patch: Record<string, string> = { ...beworbenPatch("beworben", a.beworben_am, heute) };
  if (a.status === "gemerkt") patch.status = "beworben";
  if (!Object.keys(patch).length) return true;
  // Status und Datum dürfen sich seit dem Lesen nicht geändert haben. Konflikt meldet Fehler statt Scheinerfolg.
  let q = sb.from("applications").update(patch).eq("id", id).eq("status", a.status);
  q = a.beworben_am === null ? q.is("beworben_am", null) : q.eq("beworben_am", a.beworben_am);
  const { data: gespeichert, error: schreibfehler } = await q.select("id").maybeSingle();
  return !schreibfehler && gespeichert?.id === id;
}
