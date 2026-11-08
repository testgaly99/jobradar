import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeIlike, type Filter } from "./filter";

// Postgres-Array-Literal mit Anführungszeichen, damit Kommas in Werten ("Luft- & Raumfahrt, Verteidigung") nicht trennen.
const arr = (l: string[]) => `{${l.map((s) => `"${s.replace(/[\\"]/g, "\\$&")}"`).join(",")}}`;

export const PRO_SEITE = 50;
export const SPALTEN =
  "id,unternehmen,titel,ort,staedte,remote,arbeitsmodell,vertragsart,abteilung,erfahrungslevel,url,beschreibung_kurz,erstmals_gesehen,companies!inner(groesse_klasse,kategorie,aktiv)";

// Eine Abfrage aus dem Filter. companies!inner + aktiv=true blendet Stellen inaktiver Firmen aus.
export function stellenAbfrage(sb: SupabaseClient, f: Filter) {
  let q = sb.from("jobs").select(SPALTEN, { count: "exact" })
    .eq("status", "offen").eq("sichtbar", true).eq("companies.aktiv", true);
  if (f.groesse.length) q = q.in("companies.groesse_klasse", f.groesse);
  if (f.kategorie.length) q = q.overlaps("companies.kategorie", arr(f.kategorie));
  if (f.level.length) q = q.in("erfahrungslevel", f.level);
  if (f.modell.length) q = q.in("arbeitsmodell", f.modell);
  if (f.vertrag.length) q = q.in("vertragsart", f.vertrag);
  if (f.bereich.length) q = q.in("abteilung", f.bereich);
  if (f.firma.length) q = q.in("unternehmen", f.firma);
  if (f.stadt.length) {
    const orte = f.stadt.filter((s) => s !== "Remote");
    const teile = orte.length ? [`staedte.ov.${arr(orte)}`] : [];
    if (f.stadt.includes("Remote")) teile.push("remote.eq.true");
    q = q.or(teile.join(","));
  }
  if (f.q) { const m = escapeIlike(f.q); q = q.or(`titel.ilike.${m},text.ilike.${m}`); }
  if (f.neu) q = q.gte("erstmals_gesehen", f.neu);
  const von = (f.seite - 1) * PRO_SEITE;
  return q.order("erstmals_gesehen", { ascending: false }).order("id").range(von, von + PRO_SEITE - 1);
}
