"use server";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { beworbenPatch, istStatus, istUuid, parseAbschnitt, type Abschnitt } from "@/lib/bewerbung";
import { heuteLokal } from "@/lib/filter";
import { textZuLang } from "@/lib/uebernahme";

// Jede Aktion prüft zuerst die Sitzung und die Form der id. RLS beschränkt alles auf eigene Zeilen.
async function start(id?: string) {
  if (id !== undefined && !istUuid(id)) notFound();
  const sb = await createClient();
  const { data } = await sb.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return sb;
}
const zurueck = (id: string, fehler?: string): never =>
  redirect(`/bewerbungen/${id}${fehler ? `?fehler=${encodeURIComponent(fehler)}` : ""}`);
const DB_FEHLER = "Das hat leider nicht geklappt. Bitte versuche es erneut.";

export async function bewerbungManuell(f: FormData) {
  const sb = await start();
  const r = textZuLang(String(f.get("snapshot_text") ?? ""))
    ? { fehler: "Der Anzeigentext ist zu lang (höchstens 50.000 Zeichen)." }
    : parseAbschnitt("neu", f);
  if ("fehler" in r) redirect(`/bewerbungen/neu?fehler=${encodeURIComponent(r.fehler)}`);
  const { data, error } = await sb.from("applications").insert({ ...r.daten, status: r.daten.status ?? "gemerkt" }).select("id").single();
  if (error || !data) redirect(`/bewerbungen/neu?fehler=${encodeURIComponent(DB_FEHLER)}`);
  redirect(`/bewerbungen/${data.id}`);
}

export async function abschnittSpeichern(id: string, abschnitt: Abschnitt, f: FormData) {
  const sb = await start(id);
  if (!["stelle", "bewerbung", "gehalt", "rahmen", "ergebnis", "einschaetzung", "ablauf"].includes(abschnitt)) notFound();
  const r = parseAbschnitt(abschnitt, f);
  if ("fehler" in r) return zurueck(id, r.fehler);
  const { data, error } = await sb.from("applications").update(r.daten).eq("id", id).select("id");
  if (error) zurueck(id, DB_FEHLER);
  if (!data?.length) notFound();
  revalidatePath(`/bewerbungen/${id}`);
  zurueck(id);
}

export async function statusWechseln(id: string, f: FormData) {
  const sb = await start(id);
  const status = f.get("status");
  if (!istStatus(status)) notFound();
  const { data: alt } = await sb.from("applications").select("beworben_am").eq("id", id).maybeSingle();
  if (!alt) notFound();
  const { data, error } = await sb.from("applications").update({ status, ...beworbenPatch(status, alt.beworben_am, heuteLokal()) }).eq("id", id).select("id");
  if (error || !data?.length) notFound();
  revalidatePath("/bewerbungen/kanban");
  redirect("/bewerbungen/kanban");
}

export async function personAnlegen(id: string, f: FormData) {
  const sb = await start(id);
  const r = parseAbschnitt("person", f);
  if ("fehler" in r) return zurueck(id, r.fehler);
  const { error } = await sb.from("contacts").insert({ ...r.daten, application_id: id });
  if (error) zurueck(id, DB_FEHLER);
  revalidatePath(`/bewerbungen/${id}`);
  zurueck(id);
}

export async function interviewAnlegen(id: string, f: FormData) {
  const sb = await start(id);
  const r = parseAbschnitt("interview", f);
  if ("fehler" in r) return zurueck(id, r.fehler);
  const { error } = await sb.from("interviews").insert({ ...r.daten, application_id: id });
  if (error) zurueck(id, DB_FEHLER);
  revalidatePath(`/bewerbungen/${id}`);
  zurueck(id);
}

// tabelle: Whitelist statt Tabellenname aus dem Client.
export async function eintragLoeschen(id: string, tabelle: "contacts" | "interviews", zeile: string) {
  const sb = await start(id);
  if (!istUuid(zeile) || (tabelle !== "contacts" && tabelle !== "interviews")) notFound();
  const { error } = await sb.from(tabelle).delete().eq("id", zeile).eq("application_id", id);
  if (error) zurueck(id, DB_FEHLER);
  revalidatePath(`/bewerbungen/${id}`);
  zurueck(id);
}

export async function notizAnlegen(id: string, f: FormData) {
  const sb = await start(id);
  const notiz = String(f.get("notiz") ?? "").trim();
  if (!notiz) zurueck(id, "Die Notiz ist leer.");
  const { error } = await sb.from("application_events").insert({ application_id: id, notiz });
  if (error) zurueck(id, DB_FEHLER);
  revalidatePath(`/bewerbungen/${id}`);
  zurueck(id);
}

export async function bewerbungLoeschen(id: string) {
  const sb = await start(id);
  const { error } = await sb.from("applications").delete().eq("id", id);
  if (error) zurueck(id, DB_FEHLER);
  redirect("/bewerbungen");
}
