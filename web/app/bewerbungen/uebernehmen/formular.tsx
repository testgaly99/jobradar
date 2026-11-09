"use client";
import { useActionState, useEffect, useState } from "react";
import { bewerbungAusLink } from "../actions";
import { SendeKnopf } from "../knoepfe";
import { MAX_TEXT, leseAnker, type Uebernahme } from "@/lib/uebernahme";

type Zustand = { fehler: string } | null;
const LEER: Uebernahme = { url: "", firma: "", titel: "", ort: "", text: "" };

export function UebernahmeFormular() {
  // Feste Felder im Zustand: Eingaben bleiben auch nach einer Fehlermeldung stehen.
  const [w, setW] = useState<Uebernahme>(LEER);
  const [voll, setVoll] = useState(false);
  const [zustand, aktion] = useActionState<Zustand, FormData>(async () => {
    const r = await bewerbungAusLink(w.url, w.firma, w.titel, w.text, w.ort);
    return r && "brauchtEingabe" in r ? { fehler: "Bitte Firma und Titel eintragen." } : r;
  }, null);

  useEffect(() => {
    // Jede Seite kann diese Adresse mit Anker öffnen: nur prüfen und anzeigen, nie selbst speichern.
    const d = leseAnker(location.hash);
    // Anker entfernen, damit Neuladen nicht erneut vorausfüllt.
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    if (d) { setW(d); setVoll(true); }
  }, []);

  const feld = (k: keyof Uebernahme) => ({ value: w[k], onChange: (e: { target: { value: string } }) => { const v = e.target.value; setW((x) => ({ ...x, [k]: v })); } });
  return (
    <form action={aktion} className="karte formular block">
      <p className="meldung info">
        {voll ? "Bitte prüfen und bei Bedarf ändern. Gespeichert wird erst mit „Bewerbung anlegen“."
          : "Keine Daten vom Lesezeichen-Knopf erhalten. Du kannst die Felder auch selbst ausfüllen."}
      </p>
      {zustand && <p className="meldung fehler" role="alert">{zustand.fehler}</p>}
      <label>Link (Pflicht)<input type="url" required {...feld("url")} /></label>
      <label>Firma (Pflicht)<input required {...feld("firma")} /></label>
      <label>Titel (Pflicht)<input required {...feld("titel")} /></label>
      <label>Ort<input {...feld("ort")} /></label>
      <label>Anzeigentext (optional)<textarea maxLength={MAX_TEXT} rows={10} {...feld("text")} /></label>
      <SendeKnopf text="Bewerbung anlegen" />
    </form>
  );
}
