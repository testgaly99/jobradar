"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pruefeDokument } from "@/lib/dokumente";
import { pruefeBriefkopf, pruefeVorlage } from "@/lib/unterlagen";

async function nutzer() {
  const sb = await createClient();
  const { data } = await sb.auth.getClaims();
  return { sb, uid: data?.claims?.sub as string | undefined };
}

// Der Upload ging schon vom Browser in den Speicher; hier wird nur die Zeile angelegt.
export async function dokumentAnlegen(art: string, name: string, versionDatum: string, pfad: string): Promise<{ fehler?: string }> {
  const { sb, uid } = await nutzer();
  if (!uid) return { fehler: "Bitte melde dich an." };
  const ergebnis = pruefeDokument(uid, art, name, versionDatum, pfad);
  if ("fehler" in ergebnis) return ergebnis;
  const { error } = await sb.from("documents").insert(ergebnis.daten);
  if (error) return { fehler: "Dokument konnte nicht gespeichert werden." };
  revalidatePath("/unterlagen");
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
  revalidatePath("/unterlagen");
  return {};
}

export async function dokumentHerunterladen(id: string) {
  const { sb, uid } = await nutzer();
  if (!uid) redirect("/login");
  const { data: d } = await sb.from("documents").select("storage_pfad").eq("id", id).maybeSingle();
  const { data } = d?.storage_pfad ? await sb.storage.from("dokumente").createSignedUrl(d.storage_pfad, 60) : { data: null };
  if (!data) redirect("/unterlagen?fehler=download");
  redirect(data.signedUrl);
}

export async function briefkopfSpeichern(f: FormData): Promise<{ fehler?: string }> {
  const { sb, uid } = await nutzer();
  if (!uid) return { fehler: "Bitte melde dich an." };
  const r = pruefeBriefkopf(f);
  if ("fehler" in r) return r;
  const { error } = await sb.from("briefkopf").upsert({ owner_id: uid, ...r.daten });
  if (error) return { fehler: "Briefkopf konnte nicht gespeichert werden." };
  revalidatePath("/unterlagen");
  return {};
}

export async function vorlageSpeichern(id: string | null, f: FormData): Promise<{ fehler?: string }> {
  const { sb, uid } = await nutzer();
  if (!uid) return { fehler: "Bitte melde dich an." };
  const r = pruefeVorlage(String(f.get("name") ?? ""), String(f.get("betreff") ?? ""), String(f.get("text") ?? ""));
  if ("fehler" in r) return r;
  const { error } = id
    ? await sb.from("anschreiben_vorlagen").update(r.daten).eq("id", id)
    : await sb.from("anschreiben_vorlagen").insert(r.daten);
  if (error) return { fehler: "Vorlage konnte nicht gespeichert werden." };
  revalidatePath("/unterlagen");
  return {};
}

export async function vorlageLoeschen(id: string): Promise<{ fehler?: string }> {
  const { sb, uid } = await nutzer();
  if (!uid) return { fehler: "Bitte melde dich an." };
  const { error } = await sb.from("anschreiben_vorlagen").delete().eq("id", id);
  if (error) return { fehler: "Vorlage konnte nicht gelöscht werden." };
  revalidatePath("/unterlagen");
  return {};
}
