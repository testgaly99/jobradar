"use client";
import { useEffect, useRef } from "react";
import { ERGEBNIS_LABEL } from "@/lib/bewerbung";

// Nativer <dialog>: Esc und "Abbrechen" schließen ohne Zug; erst eine Ergebnis-Wahl archiviert.
export default function ArchivDialog({ firma, onWahl, onZu }: { firma: string | null; onWahl: (ergebnis: string) => void; onZu: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (firma !== null && d && !d.open) d.showModal();
  }, [firma]);
  const zu = () => ref.current?.close();
  return (
    <dialog ref={ref} className="karte archiv-dialog" aria-labelledby="archiv-titel" onClose={onZu}>
      <h2 id="archiv-titel">Ergebnis</h2>
      {firma && <p className="gedaempft">{firma} ins Archiv legen</p>}
      <div className="archiv-wahl">
        {Object.entries(ERGEBNIS_LABEL).map(([wert, label], i) => (
          <button key={wert} type="button" className="knopf knopf-rand" autoFocus={i === 0} onClick={() => { onWahl(wert); zu(); }}>{label}</button>
        ))}
      </div>
      <button type="button" className="knopf knopf-leise" onClick={zu}>Abbrechen</button>
    </dialog>
  );
}
