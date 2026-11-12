"use server";
import { notFound, redirect, RedirectType } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { istUuid, parseAbschnitt, type Abschnitt, type Status } from "@/lib/bewerbung";
import { heuteLokal } from "@/lib/filter";
import { ladeZugZeile } from "@/lib/tracker-daten";
import { GEMERKT_GESPERRT, zugPatch, zurueckZuGemerkt, type ZugPatch } from "@/lib/zug";

// Jede Aktion prüft zuerst die Sitzung und die Form der id. RLS beschränkt alles auf eigene Zeilen.
async function start(id?: string) {
  if (id !== undefined && !istUuid(id)) notFound();
  const sb = await createClient();
  const { data } = await sb.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return sb;
}
const zurueck = (id: string, fehler?: string): never =>
  // replace: Speichern legt keinen History-Eintrag an, sonst führt "Schließen" (router.back) erst durch alle Speicherstände.
  redirect(`/bewerbung/${id}${fehler ? `?fehler=${encodeURIComponent(fehler)}` : ""}`, RedirectType.replace);
const DB_FEHLER = "Das hat leider nicht geklappt. Bitte versuche es erneut.";

export async function abschnittSpeichern(id: string, abschnitt: Abschnitt, f: FormData) {
  const sb = await start(id);
  if (!["stelle", "bewerbung", "gehalt", "rahmen", "ergebnis", "einschaetzung", "ablauf"].includes(abschnitt)) notFound();
  const r = parseAbschnitt(abschnitt, f);
  if ("fehler" in r) return zurueck(id, r.fehler);
  let daten: Record<string, unknown> = r.daten;
  let vonStatus: Status | null = null;
  // Statuswechsel im Formular "Ablauf": dieselben Zugregeln wie das Board, Bedingung im Schreibbefehl.
  if (abschnitt === "ablauf") {
    const { alt, ohne006, fehler } = await ladeZugZeile(sb, id);
    if (fehler) zurueck(id, DB_FEHLER);
    if (!alt) notFound();
    const status = r.daten.status as Status;
    if (zurueckZuGemerkt(alt.status, status)) zurueck(id, GEMERKT_GESPERRT);
    if (status !== alt.status) {
      const heute = heuteLokal();
      let patch: ZugPatch;
      // Das Formular hat kein Ergebnis-Feld: das vorhandene Ergebnis zählt, abgeschlossen ohne Ergebnis bleibt hier erlaubt.
      try { patch = zugPatch(alt, { status, ergebnis: alt.ergebnis }, heute); }
      catch { patch = { status, ...(alt.beworben_am ? {} : { beworben_am: heute }) }; }
      if (ohne006) delete patch.runde;
      daten = { ...daten, ...patch };
      vonStatus = alt.status;
    }
  }
  let q = sb.from("applications").update(daten).eq("id", id);
  if (vonStatus) q = q.eq("status", vonStatus);
  const { data, error } = await q.select("id");
  if (error) zurueck(id, DB_FEHLER);
  if (!data?.length) {
    if (vonStatus) zurueck(id, "Der Status wurde inzwischen geändert (z. B. im Board). Bitte prüfe ihn und speichere erneut.");
    notFound();
  }
  revalidatePath(`/bewerbung/${id}`);
  if (vonStatus) for (const p of ["/bewerbungen", "/stellen"]) revalidatePath(p);
  zurueck(id);
}

export async function personAnlegen(id: string, f: FormData) {
  const sb = await start(id);
  const r = parseAbschnitt("person", f);
  if ("fehler" in r) return zurueck(id, r.fehler);
  const { error } = await sb.from("contacts").insert({ ...r.daten, application_id: id });
  if (error) zurueck(id, DB_FEHLER);
  revalidatePath(`/bewerbung/${id}`);
  zurueck(id);
}

export async function interviewAnlegen(id: string, f: FormData) {
  const sb = await start(id);
  const r = parseAbschnitt("interview", f);
  if ("fehler" in r) return zurueck(id, r.fehler);
  const { error } = await sb.from("interviews").insert({ ...r.daten, application_id: id });
  if (error) zurueck(id, DB_FEHLER);
  revalidatePath(`/bewerbung/${id}`);
  zurueck(id);
}

// tabelle: Whitelist statt Tabellenname aus dem Client.
export async function eintragLoeschen(id: string, tabelle: "contacts" | "interviews", zeile: string) {
  const sb = await start(id);
  if (!istUuid(zeile) || (tabelle !== "contacts" && tabelle !== "interviews")) notFound();
  const { error } = await sb.from(tabelle).delete().eq("id", zeile).eq("application_id", id);
  if (error) zurueck(id, DB_FEHLER);
  revalidatePath(`/bewerbung/${id}`);
  zurueck(id);
}

export async function notizAnlegen(id: string, f: FormData) {
  const sb = await start(id);
  const notiz = String(f.get("notiz") ?? "").trim();
  if (!notiz) zurueck(id, "Die Notiz ist leer.");
  const { error } = await sb.from("application_events").insert({ application_id: id, notiz });
  if (error) zurueck(id, DB_FEHLER);
  revalidatePath(`/bewerbung/${id}`);
  zurueck(id);
}

export async function bewerbungLoeschen(id: string) {
  const sb = await start(id);
  const { error } = await sb.from("applications").delete().eq("id", id);
  if (error) zurueck(id, DB_FEHLER);
  redirect("/bewerbungen");
}
