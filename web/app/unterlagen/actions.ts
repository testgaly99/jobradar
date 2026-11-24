"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ANLAGE_ARTEN, loeschMeldung, pruefeDokument } from "@/lib/dokumente";
import { pruefeBriefkopf, pruefeVorlage } from "@/lib/unterlagen";
import { cvTextBereinigen } from "@/lib/cv-ergebnis";
import { createHash } from "node:crypto";
import { aktuellerNutzer } from "@/lib/nutzer";
import einwilligungen from "@/lib/cv-einwilligung.json";

const MAX_CV_TEXT = 100000;

async function nutzer() {
  const sb = await createClient();
  const { data } = await sb.auth.getClaims();
  return { sb, uid: data?.claims?.sub as string | undefined };
}

// Der Upload ging schon vom Browser in den Speicher; hier wird nur die Zeile angelegt.
export async function dokumentAnlegen(art: string, name: string, versionDatum: string, pfad: string, anlageArt?: string): Promise<{ fehler?: string }> {
  const { sb, uid } = await nutzer();
  if (!uid) return { fehler: "Bitte melde dich an." };
  if (art === "anlage" && !anlageArt) return { fehler: "Bitte wähle die Art der Anlage." };
  const ergebnis = pruefeDokument(uid, art, name, versionDatum, pfad, anlageArt);
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
  if (error) return { fehler: loeschMeldung(error.code) };
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

export async function anlageArtAendern(id: string, f: FormData) {
  const { sb, uid } = await nutzer();
  if (!uid) redirect("/login");
  const art = String(f.get("anlage_art") ?? "");
  if (!Object.hasOwn(ANLAGE_ARTEN, art)) return;
  await sb.from("documents").update({ anlage_art: art }).eq("id", id).eq("art", "anlage");
  revalidatePath("/unterlagen");
}

// Phase 6a: Einwilligung (Art. 9 DSGVO, KI-Abgleich) vor dem ersten CV-Upload; ein Eintrag je Konto mit der
// Fassung des Textes, die das Konto gesehen hat (Q274/Q275). Die Rolle bestimmt der Server, nicht der Browser.
export async function einwilligen(): Promise<{ fehler?: string }> {
  const { sb } = await nutzer();
  const n = await aktuellerNutzer();
  if (!n) return { fehler: "Bitte melde dich an." };
  const { fassung } = einwilligungen[n.admin ? "admin" : "browser"];
  const { error } = await sb.from("cv_einwilligung").upsert({ owner_id: n.id, fassung, erteilt_am: new Date().toISOString() }, { onConflict: "owner_id" });
  return error ? { fehler: "Einwilligung konnte nicht gespeichert werden." } : {};
}

// Höchstens eine Standard-CV (eindeutiger Index): erst alle zurücksetzen, dann die gewählte setzen.
export async function standardSetzen(id: string) {
  const { sb, uid } = await nutzer();
  if (!uid) redirect("/login");
  await sb.from("documents").update({ standard: false }).eq("standard", true);
  await sb.from("documents").update({ standard: true }).eq("id", id).eq("art", "cv");
  revalidatePath("/unterlagen");
}

// Korrigierter Text bekommt einen neuen Hash; der Datenbank-Trigger löscht dadurch veraltete Ergebnisse.
export async function cvTextSpeichern(id: string, f: FormData): Promise<{ fehler?: string }> {
  const { sb, uid } = await nutzer();
  if (!uid) return { fehler: "Bitte melde dich an." };
  const text = cvTextBereinigen(String(f.get("text") ?? ""));
  if (text.length > MAX_CV_TEXT) return { fehler: "Der Text ist zu lang (höchstens 100 000 Zeichen)." };
  const hash = createHash("sha256").update(text, "utf8").digest("hex");
  const { error } = await sb.from("cv_texte").upsert({ dokument_id: id, text, herkunft: text ? "korrigiert" : "leer", hash, geaendert: new Date().toISOString() });
  if (error) return { fehler: "Text konnte nicht gespeichert werden." };
  revalidatePath("/unterlagen");
  return {};
}
