import type { SupabaseClient } from "@supabase/supabase-js";

// Ohne "server-only", damit ein Node-Test es prüfen kann. Erst die Verknüpfung umsetzen, dann das alte Anschreiben
// löschen, wenn keine Bewerbung mehr darauf zeigt: Schlägt das Umsetzen fehl, bleibt alles wie es war.
export async function anschreibenSetzen(sb: SupabaseClient, applicationId: string, neuesDokumentId: string): Promise<{ fehler?: string }> {
  const { data: app, error: e1 } = await sb.from("applications").select("anschreiben_dokument_id").eq("id", applicationId).maybeSingle();
  if (e1 || !app) return { fehler: "Bewerbung nicht gefunden." };
  const { error: e2 } = await sb.from("applications").update({ anschreiben_dokument_id: neuesDokumentId }).eq("id", applicationId);
  if (e2) return { fehler: "Anschreiben konnte nicht verknüpft werden." };
  const alt = app.anschreiben_dokument_id as string | null;
  if (alt && alt !== neuesDokumentId) await unbenutztesLoeschen(sb, alt);
  return {};
}

// Fehler hier ändern nichts am Ergebnis: Die neue Verknüpfung steht, höchstens bleibt ein altes Anschreiben liegen.
async function unbenutztesLoeschen(sb: SupabaseClient, id: string) {
  const { data: andere, error } = await sb.from("applications").select("id").eq("anschreiben_dokument_id", id).limit(1);
  if (error || andere?.length) return;
  const { data: d } = await sb.from("documents").select("art,storage_pfad").eq("id", id).maybeSingle();
  if (d?.art !== "anschreiben") return; // nie einen Lebenslauf oder eine Anlage löschen
  const { error: e } = await sb.from("documents").delete().eq("id", id);
  if (e) return;
  if (d.storage_pfad) {
    const { error: s } = await sb.storage.from("dokumente").remove([d.storage_pfad]);
    if (s) console.error("Speicherobjekt nicht gelöscht:", d.storage_pfad, s.message);
  }
}
