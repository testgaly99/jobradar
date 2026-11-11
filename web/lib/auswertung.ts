// Kennzahlen für die Auswertung.
import { STATUS, type Status } from "./bewerbung.ts";
import { tagePlus } from "./filter.ts";
import { tagVon, tageZwischen } from "./karte.ts";

type B = { status: Status; ergebnis: string | null; beworben_am: string | null; erstellt_am: string; events: { datum: string; neuer_status: Status | null }[] };
const ab = (s: Status | null) => !!s && STATUS.indexOf(s) >= STATUS.indexOf("beworben");
const ANTWORT: (Status | null)[] = ["eingang_bestaetigt", "im_gespraech", "abgeschlossen"];

// Bewerbungsdatum laut Spec Regel 1; null = nie beworben.
function bewerbungsdatum(b: B): string | null {
  if (b.beworben_am) return tagVon(b.beworben_am);
  const e = b.events.filter((x) => ab(x.neuer_status)).map((x) => x.datum).sort()[0];
  if (e) return tagVon(e);
  return ab(b.status) ? tagVon(b.erstellt_am) : null;
}
const erreicht = (b: B, ...s: Status[]) => s.includes(b.status) || b.events.some((e) => e.neuer_status && s.includes(e.neuer_status));

export function kennzahlen(bewerbungen: B[], heute: string) {
  const mit = bewerbungen.map((b) => ({ b, d: bewerbungsdatum(b) })).filter((x): x is { b: B; d: string } => x.d !== null);
  const anzahl = mit.length;
  const zuWenig = anzahl < 5;
  const quote = (n: number) => (zuWenig ? null : Math.round((n / anzahl) * 100));

  const dow = (new Date(`${heute}T00:00:00Z`).getUTCDay() + 6) % 7; // Montag = 0
  const montag = tagePlus(heute, -dow);
  const proWoche = Array.from({ length: 12 }, (_, i) => ({ woche: tagePlus(montag, (i - 11) * 7), anzahl: 0 }));
  for (const { d } of mit) {
    const w = proWoche.find((x) => d >= x.woche && d <= tagePlus(x.woche, 6));
    if (w) w.anzahl++;
  }

  const tage: number[] = [];
  for (const { b, d } of mit) {
    const e = b.events.filter((x) => ANTWORT.includes(x.neuer_status) && tagVon(x.datum) >= d).map((x) => x.datum).sort()[0];
    if (e) tage.push(tageZwischen(d, tagVon(e)));
  }
  tage.sort((a, b) => a - b);
  const m = tage.length >> 1;
  const antwortzeitMedian = tage.length ? (tage.length % 2 ? tage[m] : (tage[m - 1] + tage[m]) / 2) : null;

  return {
    anzahl,
    gespraechsquote: quote(mit.filter((x) => erreicht(x.b, "im_gespraech", "angebot")).length),
    angebotsquote: quote(mit.filter((x) => erreicht(x.b, "angebot") || x.b.ergebnis === "zusage" || x.b.ergebnis === "angebot_abgelehnt").length),
    proWoche, antwortzeitMedian, zuWenig,
  };
}
