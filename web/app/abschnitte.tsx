import { markiere, type Anzeigenteil } from "@/lib/anzeige";
import type { Spalte } from "@/lib/cv-ergebnis";
import { CvMarke } from "./cv-marke";

// Text mit hervorgehobenen Treffern; <mark> als Element, nie als HTML-String.
function Markiert({ text, begriffe }: { text: string; begriffe: string[] }) {
  return <>{markiere(text, begriffe).map((s, i) => (s.treffer ? <mark key={i}>{s.text}</mark> : s.text))}</>;
}

// Gegliederte Anzeige. Ohne Abschnitte: Fließtext als Absätze unter "Beschreibung". Alles als Text.
// ebene: Überschriftenstufe der Abschnitte, passend zur Seite (direkt unter h1: 2, unter einem h2: 3).
// spalten: CV-Abgleich je empfohlener CV; Markierung am Punkt mit exakt gleichem Text.
export default function Abschnitte({ abschnitte, text, begriffe = [], ebene = 3, spalten = [] }: { abschnitte: Anzeigenteil[] | null; text: string | null; begriffe?: string[]; ebene?: 2 | 3; spalten?: Spalte[] }) {
  const H = ebene === 2 ? "h2" : "h3";
  if (abschnitte?.length) {
    return (
      <div className="anzeige">
        {abschnitte.map((a, i) => (
          <section key={i}>
            <H><Markiert text={a.titel} begriffe={begriffe} /></H>
            <ul>{a.punkte.map((p, j) => <li key={j}><Markiert text={p} begriffe={begriffe} />{spalten.map((s, k) => s.markierungen[p] && <CvMarke key={k} m={s.markierungen[p]} spalte={k} />)}</li>)}</ul>
          </section>
        ))}
      </div>
    );
  }
  const absaetze = (text ?? "").split(/\n\s*\n|\n/).map((s) => s.trim()).filter(Boolean);
  if (!absaetze.length) return <p className="gedaempft">Kein Anzeigentext gespeichert.</p>;
  return (
    <div className="anzeige">
      <H>Beschreibung</H>
      {absaetze.map((p, i) => <p key={i}><Markiert text={p} begriffe={begriffe} /></p>)}
    </div>
  );
}
