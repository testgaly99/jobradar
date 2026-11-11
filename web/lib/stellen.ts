import type { SupabaseClient } from "@supabase/supabase-js";
import { GROESSEN_REIHENFOLGE, ausschlussBedingungen, ausschlussWoerter, onlineSeitGrenze, suchBedingung, type Filter } from "./filter";

// Postgres-Array-Literal mit Anführungszeichen, damit Kommas in Werten ("Luft- & Raumfahrt, Verteidigung") nicht trennen.
const arr = (l: string[]) => `{${l.map((s) => `"${s.replace(/[\\"]/g, "\\$&")}"`).join(",")}}`;

export const PRO_SEITE = 50;
export const SPALTEN =
  "id,unternehmen,titel,ort,staedte,remote,arbeitsmodell,vertragsart,abteilung,erfahrungslevel,url,erstmals_gesehen,companies!inner(groesse_klasse,kategorie,aktiv)";

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
  if (f.land.length) q = q.in("land", f.land); // Spalte erst nach Migration 005; ohne sie gibt es in der Oberfläche keinen Land-Filter
  if (f.q) q = q.or(suchBedingung(f.q, f.volltext));
  for (const b of ausschlussBedingungen(ausschlussWoerter(f.ohne), f.volltext)) q = q.or(b);
  if (f.seit) q = q.gte("erstmals_gesehen", onlineSeitGrenze(f.seit, new Date()));
  const von = (f.seite - 1) * PRO_SEITE;
  const o = f.sort === "firma" ? q.order("unternehmen").order("id")
    : f.sort === "titel" ? q.order("titel").order("id")
    : q.order("erstmals_gesehen", { ascending: false }).order("id");
  return o.range(von, von + PRO_SEITE - 1);
}

// shortcut: "groesse" liegt in der Join-Spalte companies.groesse_klasse (in PostgREST nicht sortierbar), darum wird nur die
// geladene Seite sortiert, nicht die ganze Trefferliste. Upgrade: View oder RPC mit Sortierung in der DB.
export function nachGroesse<T extends { companies: { groesse_klasse: string | null } }>(jobs: T[]): T[] {
  const rang = (j: T) => { const i = GROESSEN_REIHENFOLGE.indexOf(j.companies?.groesse_klasse ?? ""); return i < 0 ? 99 : i; };
  return [...jobs].sort((a, b) => rang(a) - rang(b));
}
