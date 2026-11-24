"use client";
import { useState } from "react";
import type { Markierung } from "@/lib/cv-ergebnis";

// Farbe UND Label (nie nur Farbe); Klick oder Enter zeigt Beleg bzw. Begründung mit CV-Namen.
export function CvMarke({ m, spalte }: { m: Markierung; spalte: number }) {
  const [offen, setOffen] = useState(false);
  return (
    <span className={`cv-marke-feld cvm-${spalte}`}>
      <button type="button" className={`cv-marke cv-${m.farbe}`} aria-expanded={offen} onClick={() => setOffen(!offen)}>
        {m.label}
      </button>
      {offen && (
        <span className="cv-beleg">
          {m.beleg ? <>Beleg aus {m.cvName}: „{m.beleg}“</> : <>{m.cvName}</>}
          {m.begruendung && <> · {m.begruendung}</>}
        </span>
      )}
    </span>
  );
}
