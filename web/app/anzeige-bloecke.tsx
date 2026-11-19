// "Auf einen Blick" (KI-Zusammenfassung) und Steckbrief: gleiche Darstellung auf Stellenseite und Bewerbung.
import { FELD_TITEL, istUmgerechnet, UMGERECHNET_HINWEIS, type Eintrag } from "@/lib/steckbrief";
import { voraussetzungen, type Ki } from "@/lib/zusammenfassung";

export function Ueberblick({ ki, ohne }: { ki: Ki | null; ohne: string }) {
  const mitbringen = ki ? voraussetzungen(ki) : [];
  return (
    <details className="karte ueberblick" open>
      <summary>
        <span className="ueberblick-stern" aria-hidden="true">★</span>
        <h2>Auf einen Blick</h2>
        <span className="ueberblick-hinweis">KI-Zusammenfassung</span>
      </summary>
      {ki ? (
        <div lang={ki.sprache}>
          {ki.rahmen.length + ki.benefits.length > 0 && (
            <ul className="chips">
              {ki.rahmen.map((r, i) => <li key={`${i}-${r}`} className="chip">{r}</li>)}
              {ki.benefits.map((b, i) => <li key={`${i}-${b}`} className="chip chip-benefit"><span aria-hidden="true">★ </span>{b}</li>)}
            </ul>
          )}
          <div className="ueberblick-spalten">
            <section aria-labelledby="ki-aufgaben">
              <h3 id="ki-aufgaben" lang="de">Das machst du</h3>
              <ul>{ki.aufgaben.map((a, i) => <li key={`${i}-${a}`}>{a}</li>)}</ul>
            </section>
            {mitbringen.length > 0 && (
              <section aria-labelledby="ki-mitbringen">
                <h3 id="ki-mitbringen" lang="de">Das bringst du mit</h3>
                <ul className="haken">{mitbringen.map((m, i) => <li key={`${i}-${m}`}>{m}</li>)}</ul>
              </section>
            )}
          </div>
        </div>
      ) : (
        <p className="gedaempft">{ohne}</p>
      )}
    </details>
  );
}

export function SteckbriefKarte({ eintraege }: { eintraege: Eintrag[] }) {
  if (eintraege.length === 0) return null;
  return (
    <section className="steckbrief karte" aria-labelledby="steckbrief-titel">
      <h2 id="steckbrief-titel">Steckbrief</h2>
      <dl>{eintraege.map((e) => <div key={e.feld}><dt>{FELD_TITEL[e.feld]}</dt><dd title={e.feld === "gehalt" && istUmgerechnet(e.text) ? UMGERECHNET_HINWEIS : undefined}>{e.text}</dd></div>)}</dl>
    </section>
  );
}
