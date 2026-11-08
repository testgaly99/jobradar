"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ARTEN = ["cv", "anschreiben", "anlage"];

async function nutzer() {
  const sb = await createClient();
  const { data } = await sb.auth.getClaims();
  return { sb, uid: data?.claims?.sub as string | undefined };
}

// Der Upload ging schon vom Browser in den Speicher; hier wird nur die Zeile angelegt.
export async function dokumentAnlegen(art: string, name: string, versionDatum: string, pfad: string): Promise<{ fehler?: string }> {
  const { sb, uid } = await nutzer();
  if (!uid) return { fehler: "Bitte melde dich an." };
  if (!ARTEN.includes(art)) return { fehler: "Ungültige Art." };
  if (!pfad.startsWith(`${uid}/`) || pfad.includes("..")) return { fehler: "Ungültiger Speicherpfad." };
  name = name.trim();
  if (!name || name.length > 120) return { fehler: "Der Versionsname muss 1 bis 120 Zeichen lang sein." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(versionDatum)) return { fehler: "Ungültiges Datum." };
  const { error } = await sb.from("documents").insert({ art, name, version_datum: versionDatum, storage_pfad: pfad });
  if (error) return { fehler: "Dokument konnte nicht gespeichert werden." };
  revalidatePath("/dokumente");
  return {};
}

export async function dokumentLoeschen(id: string): Promise<{ fehler?: string }> {
  const { sb, uid } = await nutzer();
  if (!uid) return { fehler: "Bitte melde dich an." };
  const { data: d } = await sb.from("documents").select("storage_pfad").eq("id", id).maybeSingle();
  if (!d) return { fehler: "Dokument nicht gefunden." };
  // Zeile zuerst: der FK (restrict) blockiert Dokumente, die eine Bewerbung nutzt.
  const { error } = await sb.from("documents").delete().eq("id", id);
  if (error) return { fehler: error.code === "23503" ? "Dokument wird noch in einer Bewerbung verwendet." : "Dokument konnte nicht gelöscht werden." };
  if (d.storage_pfad) {
    const { error: e } = await sb.storage.from("dokumente").remove([d.storage_pfad]);
    if (e) console.error("Speicherobjekt nicht gelöscht:", d.storage_pfad, e.message); // Zeile ist schon weg: nicht scheitern
  }
  revalidatePath("/dokumente");
  return {};
}

export async function dokumentHerunterladen(id: string) {
  const { sb, uid } = await nutzer();
  if (!uid) redirect("/login");
  const { data: d } = await sb.from("documents").select("storage_pfad").eq("id", id).maybeSingle();
  const { data } = d?.storage_pfad ? await sb.storage.from("dokumente").createSignedUrl(d.storage_pfad, 60) : { data: null };
  if (!data) redirect("/dokumente?fehler=download");
  redirect(data.signedUrl);
}
