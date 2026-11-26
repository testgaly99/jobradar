"use client";
import { useState } from "react";
import Link from "next/link";
import AnzeigeAufklappen from "./anzeige-aufklappen";
import { firmenStellen } from "./actions";

type Stelle = { id: string; titel: string; ort: string | null };

// Lädt die Stellen der Firma erst beim ersten Öffnen; mehrere Firmen dürfen gleichzeitig offen sein.
export default function FirmaAufklappen({ firma, query, kopf }: { firma: string; query: string; kopf: React.ReactNode }) {
  const [stellen, setStellen] = useState<Stelle[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const beiToggle = async (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (!e.currentTarget.open || stellen || laedt) return;
    setLaedt(true); setFehler(null);
    try {
      const r = await firmenStellen(firma, query);
      if ("fehler" in r) setFehler(r.fehler); else setStellen(r.stellen);
    } catch { setFehler("Stellen konnten nicht geladen werden."); }
    setLaedt(false);
  };
  return (
    <details className="kachel" onToggle={beiToggle}>
      <summary>{kopf}</summary>
      {laedt && <p className="gedaempft" role="status">Lädt …</p>}
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
      {stellen && (
        <ul className="kachel-stellen">
          {stellen.map((s) => (
            <li key={s.id}>
              <Link href={"/stellen/" + encodeURIComponent(s.id)}>{s.titel}</Link>
              {s.ort && <span className="gedaempft"> · {s.ort}</span>}
              <AnzeigeAufklappen jobId={s.id} />
            </li>
          ))}
          {stellen.length === 0 && <li className="gedaempft">Keine Stellen gefunden.</li>}
        </ul>
      )}
    </details>
  );
}
