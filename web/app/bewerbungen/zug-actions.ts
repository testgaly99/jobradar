"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ERGEBNIS_LABEL, istStatus, istUuid, type Status } from "@/lib/bewerbung";
import { heuteLokal } from "@/lib/filter";
import { ladeZugZeile, spaltenFehlen } from "@/lib/tracker-daten";
import { rueckgaengigErlaubt, rundePatch, zugPatch, type ZugAlt } from "@/lib/zug";

// Diese Actions antworten mit Ergebnissen statt redirect(): das Board zeigt Fehler selbst an.
export type ZugVorher = ZugAlt & { zeitpunkt: string };
type Fehler = { ok: false; fehler: string };

const DB_FEHLER = "Das hat leider nicht geklappt. Bitte versuche es erneut.";
const GEAENDERT = "Die Bewerbung wurde inzwischen geändert.";
const OHNE_006 = "Erst Migration 006 ausführen.";
const ZU_SPAET = "Rückgängig nicht mehr möglich.";
const nein = (fehler: string): Fehler => ({ ok: false, fehler });

// Sitzung zuerst, dann die Form der id. RLS beschränkt alles auf eigene Zeilen.
async function start(id: string) {
  const sb = await createClient();
  const { data } = await sb.auth.getClaims();
  if (!data?.claims) return { sb, fehler: "Bitte melde dich erneut an." };
  if (!istUuid(id)) return { sb, fehler: "Bewerbung nicht gefunden." };
  return { sb, fehler: null };
}
function neuLaden(id: string) {
  revalidatePath("/bewerbungen");
  revalidatePath("/bewerbungen/kanban");
  revalidatePath(`/bewerbungen/${id}`);
  revalidatePath("/stellen");
}
// 1 s Spielraum für die Uhr der Datenbank (datum = now() dort).
const kurzVorher = () => new Date(Date.now() - 1000).toISOString();

export async function zugAusfuehren(
  id: string, vonStatus: Status, ziel: { status: Status; ergebnis?: string },
): Promise<{ ok: true; vorher: ZugVorher; eventIds: string[] } | Fehler> {
  const { sb, fehler } = await start(id);
  if (fehler) return nein(fehler);
  if (!istStatus(vonStatus) || !istStatus(ziel?.status)) return nein("Ungültiger Status.");
  const { alt, ohne006, fehler: lesefehler } = await ladeZugZeile(sb, id);
  if (lesefehler) return nein(DB_FEHLER);
  if (!alt) return nein("Bewerbung nicht gefunden.");
  let patch;
  try { patch = zugPatch(alt, ziel, heuteLokal()); } catch { return nein("Bitte wähle ein Ergebnis."); }
  if (ohne006) delete patch.runde;
  const zeitpunkt = new Date().toISOString();
  const seit = kurzVorher();
  const { data, error } = await sb.from("applications").update(patch).eq("id", id).eq("status", vonStatus).select("id");
  if (error) return nein(DB_FEHLER);
  if (!data?.length) return nein(GEAENDERT);
  // Verlaufseinträge dieses Zugs (vom Trigger log_status_wechsel), damit Rückgängig sie löschen kann.
  const { data: ev } = await sb.from("application_events").select("id")
    .eq("application_id", id).eq("neuer_status", patch.status).gte("datum", seit);
  neuLaden(id);
  return { ok: true, vorher: { ...alt, zeitpunkt }, eventIds: (ev ?? []).map((e) => e.id as string) };
}

const vorherOk = (v: ZugVorher) =>
  !!v && istStatus(v.status) && typeof v.zeitpunkt === "string"
  && (v.runde === null || (Number.isInteger(v.runde) && v.runde >= 1 && v.runde <= 4))
  && (v.ergebnis === null || Object.hasOwn(ERGEBNIS_LABEL, v.ergebnis))
  && (v.beworben_am === null || /^\d{4}-\d{2}-\d{2}$/.test(v.beworben_am));

export async function zugRueckgaengig(
  id: string, vorher: ZugVorher, eventIds: string[], aktuell: Status,
): Promise<{ ok: boolean; fehler?: string; hinweis?: string }> {
  const { sb, fehler } = await start(id);
  if (fehler) return nein(fehler);
  if (!vorherOk(vorher) || !istStatus(aktuell) || !Array.isArray(eventIds) || !eventIds.every((e) => typeof e === "string" && istUuid(e))) return nein("Ungültige Angaben.");
  if (!rueckgaengigErlaubt(vorher.zeitpunkt, new Date())) return nein(ZU_SPAET);
  const { status, runde, ergebnis, beworben_am } = vorher;
  const seit = kurzVorher();
  const setze = (werte: Record<string, unknown>) =>
    sb.from("applications").update(werte).eq("id", id).eq("status", aktuell).select("id");
  let { data, error } = await setze({ status, runde, ergebnis, beworben_am });
  if (spaltenFehlen(error)) ({ data, error } = await setze({ status, ergebnis, beworben_am }));
  if (error) return nein(DB_FEHLER);
  if (!data?.length) return nein(ZU_SPAET);
  // Auch den Eintrag, den der Trigger für die Rücknahme selbst schreibt, wieder entfernen.
  const { data: neu } = await sb.from("application_events").select("id")
    .eq("application_id", id).eq("neuer_status", status).gte("datum", seit);
  const alle = [...new Set([...eventIds, ...(neu ?? []).map((e) => e.id as string)])];
  neuLaden(id);
  if (!alle.length) return { ok: true };
  const { data: weg, error: delFehler } = await sb.from("application_events").delete().in("id", alle).eq("application_id", id).select("id");
  // Vor 006 fehlt die Lösch-Policy: dann löscht RLS still 0 Zeilen. Der Status ist trotzdem zurück.
  if (delFehler || (weg?.length ?? 0) < alle.length) return { ok: true, hinweis: "Verlauf konnte nicht bereinigt werden (Migration 006 fehlt)." };
  return { ok: true };
}

export async function rundeAendern(id: string, richtung: 1 | -1): Promise<{ ok: true; runde: number | null } | Fehler> {
  const { sb, fehler } = await start(id);
  if (fehler) return nein(fehler);
  if (richtung !== 1 && richtung !== -1) return nein("Ungültige Richtung.");
  const { data: alt, error } = await sb.from("applications").select("runde").eq("id", id).maybeSingle();
  if (spaltenFehlen(error)) return nein(OHNE_006);
  if (error) return nein(DB_FEHLER);
  if (!alt) return nein("Bewerbung nicht gefunden.");
  const p = rundePatch(alt.runde, richtung);
  if (!p) return { ok: true, runde: alt.runde };
  const q = sb.from("applications").update(p).eq("id", id);
  const { data, error: e2 } = await (alt.runde === null ? q.is("runde", null) : q.eq("runde", alt.runde)).select("id");
  if (spaltenFehlen(e2)) return nein(OHNE_006);
  if (e2) return nein(DB_FEHLER);
  if (!data?.length) return nein(GEAENDERT);
  neuLaden(id);
  return { ok: true, runde: p.runde };
}

export async function kommentarSpeichern(id: string, text: string): Promise<{ ok: true } | Fehler> {
  const { sb, fehler } = await start(id);
  if (fehler) return nein(fehler);
  const kommentar = typeof text === "string" ? text.trim() : "";
  if (kommentar.length > 140) return nein("Der Kommentar ist zu lang (höchstens 140 Zeichen).");
  const { data, error } = await sb.from("applications").update({ kommentar: kommentar || null }).eq("id", id).select("id");
  if (spaltenFehlen(error)) return nein(OHNE_006);
  if (error) return nein(DB_FEHLER);
  if (!data?.length) return nein("Bewerbung nicht gefunden.");
  neuLaden(id);
  return { ok: true };
}

export async function schrittErledigt(id: string): Promise<{ ok: true } | Fehler> {
  const { sb, fehler } = await start(id);
  if (fehler) return nein(fehler);
  const { data: alt, error } = await sb.from("applications").select("naechster_schritt").eq("id", id).maybeSingle();
  if (error) return nein(DB_FEHLER);
  if (!alt) return nein("Bewerbung nicht gefunden.");
  const text = alt.naechster_schritt?.trim();
  if (!text) return nein("Es ist kein nächster Schritt eingetragen.");
  const { data, error: e2 } = await sb.from("applications").update({ naechster_schritt: null, naechster_schritt_faellig: null })
    .eq("id", id).eq("naechster_schritt", alt.naechster_schritt).select("id");
  if (e2) return nein(DB_FEHLER);
  if (!data?.length) return nein(GEAENDERT);
  const { error: e3 } = await sb.from("application_events").insert({ application_id: id, notiz: `Erledigt: ${text}` });
  neuLaden(id);
  if (e3) return nein("Der Schritt ist erledigt, aber der Verlaufseintrag fehlt.");
  return { ok: true };
}
