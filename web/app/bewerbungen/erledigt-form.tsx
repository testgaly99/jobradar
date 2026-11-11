"use client";
import { useActionState } from "react";
import { schrittErledigt } from "./zug-actions";

const FEHLER = "Das hat leider nicht geklappt. Bitte versuche es erneut.";

// Meldet Fehler von schrittErledigt; bei Erfolg verschwindet die Zeile durch die Revalidierung.
export default function ErledigtForm({ id, label }: { id: string; label: string }) {
  const [fehler, aktion, laeuft] = useActionState(async (): Promise<string | null> => {
    try {
      const r = await schrittErledigt(id);
      return r.ok ? null : r.fehler;
    } catch { return FEHLER; }
  }, null);
  return (
    <form action={aktion}>
      <button className="knopf knopf-rand knopf-schmal" type="submit" disabled={laeuft} aria-label={label}>✓ Erledigt</button>
      {fehler && <span className="meldung fehler" role="alert">{fehler}</span>}
    </form>
  );
}
