"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pruefeDokument } from "@/lib/dokumente";
import { istUuid } from "@/lib/bewerbung";
import { heuteLokal } from "@/lib/filter";
import { anschreibenSetzen } from "@/lib/anschreiben-setzen";

// Die Datei ging schon vom Browser in den Speicher; hier entsteht die Dokument-Zeile und die Verknüpfung.
export async function anschreibenSpeichern(applicationId: string, pfad: string, name: string): Promise<{ fehler?: string }> {
  const sb = await createClient();
  const { data: c } = await sb.auth.getClaims();
  const uid = c?.claims?.sub as string | undefined;
  if (!uid) return { fehler: "Bitte melde dich an." };
  if (!istUuid(applicationId)) return { fehler: "Bewerbung nicht gefunden." };
  const r = pruefeDokument(uid, "anschreiben", name.slice(0, 120), heuteLokal(), pfad);
  if ("fehler" in r) return r;
  const { data: neu, error } = await sb.from("documents").insert(r.daten).select("id").single();
  if (error || !neu) return { fehler: "Anschreiben konnte nicht gespeichert werden." };
  const s = await anschreibenSetzen(sb, applicationId, neu.id);
  if (s.fehler) {
    // Nichts Halbes liegen lassen: neue Zeile und Datei wieder entfernen.
    await sb.from("documents").delete().eq("id", neu.id);
    await sb.storage.from("dokumente").remove([pfad]);
    return s;
  }
  revalidatePath(`/bewerbung/${applicationId}`);
  revalidatePath("/bewerbungen");
  return {};
}

// Haken an/aus: RLS prüft zusätzlich, dass Bewerbung und Dokument dem Nutzer gehören.
export async function anlageUmschalten(applicationId: string, documentId: string, an: boolean): Promise<{ fehler?: string }> {
  if (!istUuid(applicationId) || !istUuid(documentId)) return { fehler: "Ungültige Angabe." };
  const sb = await createClient();
  const { error } = an
    ? await sb.from("bewerbung_anlagen").upsert({ application_id: applicationId, document_id: documentId }, { ignoreDuplicates: true })
    : await sb.from("bewerbung_anlagen").delete().eq("application_id", applicationId).eq("document_id", documentId);
  if (error) return { fehler: "Die Anlage konnte nicht gespeichert werden." };
  revalidatePath(`/bewerbung/${applicationId}`);
  return {};
}
