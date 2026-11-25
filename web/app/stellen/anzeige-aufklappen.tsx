"use client";
import { useState } from "react";
import Abschnitte from "../abschnitte";
import { anzeigeLaden } from "./actions";

type Geladen = Exclude<Awaited<ReturnType<typeof anzeigeLaden>>, { fehler: string }>;

// Lädt die Anzeige erst beim ersten Öffnen (eine Anfrage); nur der farbig markierte Anzeigentext, keine Zusatzzeilen.
export default function AnzeigeAufklappen({ jobId }: { jobId: string }) {
  const [daten, setDaten] = useState<Geladen | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const beiToggle = async (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (!e.currentTarget.open || daten || laedt) return;
    setLaedt(true); setFehler(null);
    try {
      const r = await anzeigeLaden(jobId);
      if ("fehler" in r) setFehler(r.fehler); else setDaten(r);
    } catch { setFehler("Anzeige konnte nicht geladen werden."); }
    setLaedt(false);
  };
  return (
    <details className="stelle-anzeige" onToggle={beiToggle}>
      <summary>Anzeige lesen</summary>
      {laedt && <p className="gedaempft" role="status">Lädt …</p>}
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
      {daten && <Abschnitte abschnitte={daten.abschnitte} text={daten.text} begriffe={daten.begriffe} ebene={3} spalten={daten.spalten} />}
    </details>
  );
}
