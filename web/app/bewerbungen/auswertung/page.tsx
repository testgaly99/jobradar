import { createClient } from "@/lib/supabase/server";
import { kennzahlen } from "@/lib/auswertung";
import { datumDe } from "@/lib/bewerbung";
import { heuteLokal, tagePlus } from "@/lib/filter";
import { ladeAuswertung } from "@/lib/tracker-daten";
import UnterNav from "../unternav";
import Woche from "../woche";

// "09.11.–15.11." aus dem Montag (YYYY-MM-DD).
const tagMonat = (iso: string) => datumDe(iso).slice(0, 6);
const zeitraum = (montag: string) => `${tagMonat(montag)}–${tagMonat(tagePlus(montag, 6))}`;
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
            <ul className="wochenbalken">
              {k.proWoche.map((w) => (
                <li key={w.woche} aria-label={`${zeitraum(w.woche)}: ${w.anzahl} Bewerbungen`}>
                  <span className="num">{zeitraum(w.woche)}</span>
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
