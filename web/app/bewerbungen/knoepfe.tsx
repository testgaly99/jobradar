"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { bewerbungAusLink } from "./actions";

// Absende-Knopf: sperrt sich, solange das Formular läuft.
export function SendeKnopf({ text, klasse = "knopf", warte = "Bitte warten …", gedrueckt, title }: { text: string; klasse?: string; warte?: string; gedrueckt?: boolean; title?: string }) {
  const { pending } = useFormStatus();
  return <button className={klasse} type="submit" disabled={pending} aria-pressed={gedrueckt} title={title}>{pending ? warte : text}</button>;
}

export function DruckKnopf() {
  return <button type="button" className="knopf knopf-rand knopf-schmal" onClick={() => window.print()}>Drucken/PDF</button>;
}

// Formular mit Rückfrage vor dem Absenden (Löschen).
export function LoeschForm({ action, frage, text = "Löschen" }: { action: () => Promise<void>; frage: string; text?: string }) {
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(frage)) e.preventDefault(); }}>
      <SendeKnopf text={text} klasse="knopf knopf-gefahr knopf-schmal" />
    </form>
  );
}

type Zustand = { brauchtEingabe: true; fuer: string } | { fehler: string } | null;

export function LinkFormular() {
  const [url, setUrl] = useState("");
  const [firma, setFirma] = useState("");
  const [titel, setTitel] = useState("");
  const [zustand, aktion] = useActionState<Zustand, FormData>(
    async () => {
      const r = await bewerbungAusLink(url, firma, titel);
      return r && "brauchtEingabe" in r ? { brauchtEingabe: true as const, fuer: url } : r;
    },
    null,
  );
  // Felder und Meldung gelten nur für den Link, für den gefragt wurde (sonst blockieren sie einen neuen Link).
  const brauchtEingabe = zustand !== null && "brauchtEingabe" in zustand && zustand.fuer === url;
  return (
    <form action={aktion} className="formular linkform">
      <label>Link einfügen
        <input type="url" required value={url} onChange={(e) => { setUrl(e.target.value); setFirma(""); setTitel(""); }} placeholder="https://…" />
      </label>
      {brauchtEingabe && (
        <>
          <p className="meldung info">Aus dem Link ist nichts erkennbar. Bitte Firma und Titel eintragen.</p>
          <label>Firma
            <input required value={firma} onChange={(e) => setFirma(e.target.value)} />
          </label>
          <label>Titel
            <input required value={titel} onChange={(e) => setTitel(e.target.value)} />
          </label>
        </>
      )}
      {zustand && "fehler" in zustand && <p className="meldung fehler" role="alert">{zustand.fehler}</p>}
      <SendeKnopf text={brauchtEingabe ? "Bewerbung anlegen" : "Anlegen"} />
    </form>
  );
}
