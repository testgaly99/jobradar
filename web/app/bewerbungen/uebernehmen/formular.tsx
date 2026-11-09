"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { bewerbungAusLink } from "../actions";
import { SendeKnopf } from "../knoepfe";
import { MAX_TEXT, pruefeUebernahme, type Uebernahme } from "@/lib/uebernahme";

type Zustand = { fehler: string } | null;
const feld = (f: FormData, k: string) => String(f.get(k) ?? "");

export function UebernahmeFormular() {
  const [daten, setDaten] = useState<Uebernahme | null>(null);
  const erhalten = useRef(false);
  const [zustand, aktion] = useActionState<Zustand, FormData>(async (_, f) => {
    const r = await bewerbungAusLink(feld(f, "url"), feld(f, "firma"), feld(f, "titel"), feld(f, "text"), feld(f, "ort"));
    return r && "brauchtEingabe" in r ? { fehler: "Bitte Firma und Titel eintragen." } : r;
  }, null);

  useEffect(() => {
    // Jede Seite kann uns Nachrichten schicken: nur prüfen und anzeigen, nie selbst speichern. Herkunft nur fürs Protokoll.
    const an = (e: MessageEvent) => {
      const d = pruefeUebernahme(e.data);
      if (!d) return;
      try { (e.source as Window | null)?.postMessage("jobradar-ok", "*"); } catch { /* Absender schon weg */ }
      if (erhalten.current) return;
      erhalten.current = true;
      console.info("Stelle übernommen von", e.origin);
      setDaten(d);
    };
    window.addEventListener("message", an);
    window.opener?.postMessage("jobradar-bereit", "*");
    return () => window.removeEventListener("message", an);
  }, []);

  return (
    // key: einmal neu aufbauen, wenn die Daten ankommen, damit die Vorgaben in den Feldern stehen.
    <form key={daten ? "voll" : "leer"} action={aktion} className="karte formular block">
      <p className="meldung info">
        {daten ? "Bitte prüfen und bei Bedarf ändern. Gespeichert wird erst mit „Bewerbung anlegen“."
          : "Warte auf Daten vom Lesezeichen-Knopf … Du kannst die Felder auch selbst ausfüllen."}
      </p>
      {zustand && <p className="meldung fehler" role="alert">{zustand.fehler}</p>}
      <label>Link (Pflicht)<input name="url" type="url" required defaultValue={daten?.url} /></label>
      <label>Firma (Pflicht)<input name="firma" required defaultValue={daten?.firma} /></label>
      <label>Titel (Pflicht)<input name="titel" required defaultValue={daten?.titel} /></label>
      <label>Ort<input name="ort" defaultValue={daten?.ort} /></label>
      <label>Anzeigentext (optional)<textarea name="text" maxLength={MAX_TEXT} rows={10} defaultValue={daten?.text} /></label>
      <SendeKnopf text="Bewerbung anlegen" />
    </form>
  );
}
