import type { SupabaseClient } from "@supabase/supabase-js";

// Ohne "server-only", damit ein Node-Skript es testen kann. Reihenfolge: Bewerbungen (cascade auf Kontakte,
// Interviews, Verlauf), Dokument-Zeilen, Dateien, Nutzer. Bewerbungen zuerst, weil deren FK auf documents
// RESTRICT ist; Zeilen vor Dateien, damit ein Abbruch nur verwaiste Dateien hinterlässt (Retry räumt auf).
export async function loescheNutzerMit(sb: SupabaseClient, uid: string): Promise<void> {
  for (const t of ["applications", "documents"]) {
    const { error: e } = await sb.from(t).delete().eq("owner_id", uid);
    if (e) throw new Error("Die Daten konnten nicht gelöscht werden.");
  }
  const namen: string[] = [];
  // Erst alles einsammeln, dann entfernen: so verschiebt das Löschen keine Seiten.
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await sb.storage.from("dokumente").list(uid, { limit: 100, offset });
    if (error) throw new Error("Dateien konnten nicht aufgelistet werden.");
    namen.push(...data.map((o) => `${uid}/${o.name}`));
    if (data.length < 100) break;
  }
  for (let i = 0; i < namen.length; i += 100) {
    const { error } = await sb.storage.from("dokumente").remove(namen.slice(i, i + 100));
    if (error) throw new Error("Dateien konnten nicht gelöscht werden.");
  }
  const { error } = await sb.auth.admin.deleteUser(uid);
  if (error) throw new Error("Das Konto konnte nicht gelöscht werden.");
}
