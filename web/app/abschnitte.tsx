import { markiere, type Anzeigenteil } from "@/lib/anzeige";

// Text mit hervorgehobenen Treffern; <mark> als Element, nie als HTML-String.
function Markiert({ text, begriffe }: { text: string; begriffe: string[] }) {
  return <>{markiere(text, begriffe).map((s, i) => (s.treffer ? <mark key={i}>{s.text}</mark> : s.text))}</>;
}

// Gegliederte Anzeige. Ohne Abschnitte: Fließtext als Absätze unter "Beschreibung". Alles als Text.
export default function Abschnitte({ abschnitte, text, begriffe = [] }: { abschnitte: Anzeigenteil[] | null; text: string | null; begriffe?: string[] }) {
  if (abschnitte?.length) {
    return (
      <div className="anzeige">
        {abschnitte.map((a, i) => (
          <section key={i}>
            <h3><Markiert text={a.titel} begriffe={begriffe} /></h3>
            <ul>{a.punkte.map((p, j) => <li key={j}><Markiert text={p} begriffe={begriffe} /></li>)}</ul>
          </section>
        ))}
      </div>
    );
  }
  const absaetze = (text ?? "").split(/\n\s*\n|\n/).map((s) => s.trim()).filter(Boolean);
  if (!absaetze.length) return <p className="gedaempft">Kein Anzeigentext gespeichert.</p>;
  return (
    <div className="anzeige">
      <h3>Beschreibung</h3>
      {absaetze.map((p, i) => <p key={i}><Markiert text={p} begriffe={begriffe} /></p>)}
    </div>
  );
}
