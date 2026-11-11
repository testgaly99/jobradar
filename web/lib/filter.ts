// Reine Funktionen: URL <-> Filter. Mehrfachwerte stehen als wiederholte Parameter (?stadt=A&stadt=B).
export const GRUPPEN = ["groesse", "kategorie", "level", "modell", "vertrag", "bereich", "firma", "stadt", "land"] as const;
export type Gruppe = (typeof GRUPPEN)[number];
export const SEIT_WERTE = ["heute", "3", "7", "30"] as const;
export type Seit = (typeof SEIT_WERTE)[number];
export type Filter = Record<Gruppe, string[]> & { q: string; volltext: boolean; seit: Seit | ""; seite: number };
type Params = Record<string, string | string[] | undefined>;


const liste = (v: string | string[] | undefined) =>
  [...new Set((Array.isArray(v) ? v : v === undefined ? [] : [v]).map((s) => s.trim()).filter(Boolean))];

export function leseFilter(p: Params): Filter {
  const f = { q: liste(p.q)[0] ?? "", volltext: liste(p.volltext)[0] === "1", seit: "", seite: 1 } as Filter;
  for (const g of GRUPPEN) f[g] = liste(p[g]);
  const seit = liste(p.seit)[0] as Seit;
  if (SEIT_WERTE.includes(seit)) f.seit = seit;
  const s = Number(liste(p.seite)[0]);
  if (Number.isInteger(s) && s > 1) f.seite = s;
  return f;
}

export function filterZuUrl(f: Filter): string {
  const u = new URLSearchParams();
  for (const g of GRUPPEN) for (const v of f[g]) u.append(g, v);
  if (f.q) u.set("q", f.q);
  if (f.volltext) u.set("volltext", "1");
  if (f.seit) u.set("seit", f.seit);
  if (f.seite > 1) u.set("seite", String(f.seite));
  const s = u.toString();
  return s ? `/stellen?${s}` : "/stellen";
}

// Macht aus Nutzereingabe ein Muster fuer PostgREST `ilike` innerhalb von .or(): %, _ und \ werden
// ilike-maskiert, danach wird das Ganze in "..." gesetzt, damit , ( ) den Filter nicht aufbrechen.
export function escapeIlike(s: string): string {
  const m = s.replace(/[\\%_]/g, "\\$&");
  return `"%${m.replace(/[\\"]/g, "\\$&")}%"`;
}

// Datum (YYYY-MM-DD) plus n Tage, ohne Zeitzonen-Fallen.
export function tagePlus(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function heuteLokal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Größenklassen in fester Reihenfolge (alphabetisch wäre "1.000+" vor "<50").
export const GROESSEN_REIHENFOLGE = ["<50", "50–249", "250–999", "1.000+"];

export const LEVEL_REIHENFOLGE = ["Junior", "Mid", "Senior", "Lead"];

// Facettenwerte: Größe und Level in fester Reihenfolge (Unbekanntes ans Ende), sonst alphabetisch.
export function facettenSortieren(g: Gruppe, namen: string[]): string[] {
  const reihe = g === "groesse" ? GROESSEN_REIHENFOLGE : g === "level" ? LEVEL_REIHENFOLGE : [];
  const rang = (n: string) => { const i = reihe.indexOf(n); return i < 0 ? 99 : i; };
  return [...namen].sort((a, b) => rang(a) - rang(b) || a.localeCompare(b, "de"));
}

const LEVEL: Record<string, string> = {
  Junior: "Junior (0–2 Jahre)", Mid: "Mid (2–5 Jahre)", Senior: "Senior (5–8 Jahre)", Lead: "Lead (8+ Jahre)",
};
export const levelText = (level: string): string => LEVEL[level] ?? level;

export const lokal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Frühestes Datum (YYYY-MM-DD, lokal) für "Online seit".
export function onlineSeitGrenze(wahl: Seit, jetzt: Date): string {
  return wahl === "heute" ? lokal(jetzt) : tagePlus(lokal(jetzt), -Number(wahl));
}

// "Neu" = seit höchstens 3 Tagen online.
// shortcut: echte Veröffentlichungsdaten aus dem ATS (Ashby publishedAt, Greenhouse first_published, Recruitee published_at,
// JSON-LD datePosted) kommen mit Phase 4 als Spalte veroeffentlicht_am; bis dahin gilt "erstmals gesehen".
// Stellen des allerersten Laufs tragen nur dessen Datum, sind also nicht wirklich neu.
export const istNeu = (erstmals: string, jetzt: Date, ersterLauf: string | null = null): boolean =>
  erstmals >= tagePlus(lokal(jetzt), -3) && !(ersterLauf && erstmals <= ersterLauf);

// Anzeige der Stadt: bei Filter die gefilterte Stadt der Stelle, sonst erste Stadt plus Anzahl der übrigen.
export function stadtAnzeige(staedte: string[], gefiltert: string[]): string {
  const treffer = staedte.find((s) => gefiltert.includes(s));
  if (treffer) return treffer;
  if (!staedte.length) return "";
  return staedte.length > 1 ? `${staedte[0]} +${staedte.length - 1} weitere` : staedte[0];
}

// Baustein für PostgREST .or(): Standard nur Titel, mit Volltext auch der Anzeigentext.
export function suchBedingung(q: string, volltext: boolean): string {
  const m = escapeIlike(q);
  return volltext ? `titel.ilike.${m},text.ilike.${m}` : `titel.ilike.${m}`;
}

export const AUSGEBLENDET_BRANCHE = "Startup / Venture-finanziert";

// Ohne Land-Facette (Migration 005 fehlt) gibt es keine Spalte jobs.land: Land-Filter wird ignoriert.
export const landNurMitFacette = (f: Filter, hatLand: boolean): Filter => (hatLand ? f : { ...f, land: [] });

// Job-ids sind "<firma>:<ext>"; Firmenname darf Leerzeichen enthalten.
export const ID_FORM = /^[^:]{1,100}:\S{1,200}$/;
