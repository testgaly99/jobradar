// Reine Funktionen: URL <-> Filter. Mehrfachwerte stehen als wiederholte Parameter (?stadt=A&stadt=B).
export const GRUPPEN = ["groesse", "kategorie", "level", "modell", "vertrag", "bereich", "firma", "stadt"] as const;
export type Gruppe = (typeof GRUPPEN)[number];
export type Filter = Record<Gruppe, string[]> & { q: string; neu: string; seite: number };
type Params = Record<string, string | string[] | undefined>;

const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const liste = (v: string | string[] | undefined) =>
  [...new Set((Array.isArray(v) ? v : v === undefined ? [] : [v]).map((s) => s.trim()).filter(Boolean))];

export function leseFilter(p: Params): Filter {
  const f = { q: liste(p.q)[0] ?? "", neu: "", seite: 1 } as Filter;
  for (const g of GRUPPEN) f[g] = liste(p[g]);
  const neu = liste(p.neu)[0] ?? "";
  if (DATUM.test(neu)) f.neu = neu;
  const s = Number(liste(p.seite)[0]);
  if (Number.isInteger(s) && s > 1) f.seite = s;
  return f;
}

export function filterZuUrl(f: Filter): string {
  const u = new URLSearchParams();
  for (const g of GRUPPEN) for (const v of f[g]) u.append(g, v);
  if (f.q) u.set("q", f.q);
  if (f.neu) u.set("neu", f.neu);
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
