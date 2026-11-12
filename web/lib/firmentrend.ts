// Einstellungs-Kurve einer Firma aus den Laufberichten (Tabelle laeufe), ohne Next-Importe, damit testbar.
type Lauf = { datum: string; bericht: unknown };
type Eintrag = { name?: unknown; fehler?: unknown; gefunden?: unknown; gefiltert?: unknown; neu?: unknown; geschlossen?: unknown };
export type Trend = { punkte: { datum: string; offen: number }[]; neu: number; geschlossen: number; seit: string | null };

const zahl = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : 0);
const tagMs = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const montag = (d: string) => { const t = tagMs(d); return t - ((new Date(t).getUTCDay() + 6) % 7) * 864e5; };

// offen = relevante Stellen (gefunden − gefiltert) am letzten Lauf jeder Woche; neu/geschlossen = Summe der letzten `tage` Tage.
// Der erste Lauf einer Firma zählt nicht als "neu" (das ist die Erstaufnahme, kein Einstellen). Läufe mit Fehler zählen nicht.
export function firmenTrend(laeufe: Lauf[], firma: string, heute: string, tage = 30, wochen = 12): Trend {
  const eigene = laeufe
    .map((l) => {
      const firmen = (l.bericht as { firmen?: Eintrag[] } | null)?.firmen;
      const e = Array.isArray(firmen) ? firmen.find((f) => f?.name === firma) : undefined;
      return e && !e.fehler ? { datum: l.datum, e } : null;
    })
    .filter((x): x is { datum: string; e: Eintrag } => !!x)
    .sort((a, b) => a.datum.localeCompare(b.datum));
  const proWoche = new Map<number, { datum: string; offen: number }>();
  for (const { datum, e } of eigene) proWoche.set(montag(datum), { datum, offen: Math.max(0, zahl(e.gefunden) - zahl(e.gefiltert)) });
  const grenze = tagMs(heute) - tage * 864e5;
  const fenster = eigene.filter((x, i) => i > 0 && tagMs(x.datum) > grenze);
  return {
    punkte: [...proWoche.values()].slice(-wochen),
    neu: fenster.reduce((s, x) => s + zahl(x.e.neu), 0),
    geschlossen: fenster.reduce((s, x) => s + zahl(x.e.geschlossen), 0),
    seit: eigene.find((x) => tagMs(x.datum) > grenze)?.datum ?? null,
  };
}
