"use client";
import { useState } from "react";

// Kopiert die eigene Jobradar-Adresse für die Erweiterungsoptionen.
export function AdresseKopieren({ adresse }: { adresse: string }) {
  const [kopiert, setKopiert] = useState(false);
  return (
    <p className="aktionsreihe">
      <code>{adresse}</code>
      <button className="knopf knopf-rand knopf-schmal" type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(adresse); setKopiert(true); } catch { setKopiert(false); }
      }}>{kopiert ? "Kopiert ✓" : "Adresse kopieren"}</button>
    </p>
  );
}
