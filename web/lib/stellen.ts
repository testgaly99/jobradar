import type { SupabaseClient } from "@supabase/supabase-js";
import { ausschlussBedingungen, ausschlussWoerter, onlineSeitGrenze, seitenBereich, suchBedingung, type Filter } from "./filter.ts";

// Postgres-Array-Literal mit Anführungszeichen, damit Kommas in Werten ("Luft- & Raumfahrt, Verteidigung") nicht trennen.
const arr = (l: string[]) => `{${l.map((s) => `"${s.replace(/[\\"]/g, "\\$&")}"`).join(",")}}`;

export { PRO_SEITE } from "./filter.ts";
export const SPALTEN =
  "id,unternehmen,titel,ort,staedte,remote,arbeitsmodell,vertragsart,abteilung,erfahrungslevel,url,erstmals_gesehen,companies!inner(groesse_klasse,groesse_rang,kategorie,aktiv)";

// Eine Abfrage aus dem Filter. companies!inner + aktiv=true blendet Stellen inaktiver Firmen aus.
export function stellenAbfrage(sb: SupabaseClient, f: Filter) {
  const mitListe = f.liste.length > 0;
  // Die Funktion liefert eine Zeile je Stelle. PostgREST filtert, zählt und sortiert global, erst dann folgt range().
  let q = mitListe
    ? sb.rpc("ranking_stellen", { p_listen: f.liste }, { count: "exact" })
      .select(SPALTEN.replace("companies!inner(groesse_klasse,groesse_rang,kategorie,aktiv)", "companies"))
    : sb.from("jobs").select(SPALTEN, { count: "exact" })
      .eq("status", "offen").eq("sichtbar", true).eq("companies.aktiv", true);
  if (f.groesse.length) q = q.in(mitListe ? "groesse_klasse" : "companies.groesse_klasse", f.groesse);
  if (f.kategorie.length) q = q.overlaps(mitListe ? "kategorie" : "companies.kategorie", arr(f.kategorie));
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
  const { von, bis } = seitenBereich(f.seite);
  const o = f.sort === "groesse" ? q.order(mitListe ? "companies->groesse_rang" : "companies(groesse_rang)")
    .order("erstmals_gesehen", { ascending: false }).order("id")
    : f.sort === "rang" && f.liste.length === 1 ? q.order("rang", { nullsFirst: false }).order("unternehmen").order("id")
    : f.sort === "firma" ? q.order("unternehmen").order("id")
    : f.sort === "titel" ? q.order("titel").order("id")
    : q.order("erstmals_gesehen", { ascending: false }).order("id");
  return o.range(von, bis);
}
