"use client";
// Fängt unerwartete Fehler im Bereich "Bewerbungen" ab, statt die rohe Next-Fehlerseite zu zeigen.
export default function Fehler({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="meldung fehler" role="alert">
      <p>Da ist etwas schiefgegangen. Bitte versuche es erneut.</p>
      <button type="button" className="knopf knopf-rand knopf-schmal" onClick={reset}>Erneut versuchen</button>
    </div>
  );
}
