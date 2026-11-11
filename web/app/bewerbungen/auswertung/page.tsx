import { createClient } from "@/lib/supabase/server";
import { kennzahlen } from "@/lib/auswertung";
import { datumDe } from "@/lib/bewerbung";
import { heuteLokal } from "@/lib/filter";
import { ladeAuswertung } from "@/lib/tracker-daten";
import UnterNav from "../unternav";
import Woche from "../woche";

// Kalenderwoche nach ISO 8601 aus dem Montag (YYYY-MM-DD).
function kw(montag: string) {
  const d = new Date(`${montag}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3); // Donnerstag der Woche
  const jan1 = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - jan1) / 864e5 / 7) + 1;
}
const prozent = (n: number | null) => (n === null ? "–" : `${n} %`);

export default async function Seite() {
  const { zeilen, fehler } = await ladeAuswertung(await createClient());
  const k = kennzahlen(zeilen, heuteLokal());
  const max = Math.max(1, ...k.proWoche.map((w) => w.anzahl));
  const kacheln: [string, string][] = [
    ["Gesprächsquote", prozent(k.gespraechsquote)],
    ["Angebotsquote", prozent(k.angebotsquote)],
    ["Antwortzeit (Median)", k.antwortzeitMedian === null ? "–" : `${k.antwortzeitMedian} Tage`],
    ["Bewerbungen", String(k.anzahl)],
  ];
  return (
    <>
      <h1>Bewerbungen</h1>
      <Woche />
      <UnterNav aktiv="auswertung" />
      {fehler ? <p className="meldung fehler" role="alert">{fehler}</p> : (
        <>
          {k.zuWenig && <p className="meldung info">Noch zu wenig Daten (mindestens 5 Bewerbungen).</p>}
          <div className="kacheln">
            {kacheln.map(([name, wert]) => (
              <div key={name} className="karte kachel"><p>{name}</p><p className="kachelwert num">{wert}</p></div>
            ))}
          </div>
          <section className="karte block">
            <h2>Bewerbungen pro Woche</h2>
            <ul className="balken">
              {k.proWoche.map((w) => (
                <li key={w.woche} aria-label={`KW ${kw(w.woche)}: ${w.anzahl} Bewerbungen`} title={`ab ${datumDe(w.woche)}`}>
                  <span className="num">KW {kw(w.woche)}</span>
                  <span className="balkenfeld"><span className="balkenfuell" style={{ width: `${(w.anzahl / max) * 100}%` }} /></span>
                  <span className="num">{w.anzahl}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
