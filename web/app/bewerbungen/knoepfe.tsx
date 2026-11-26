"use client";
import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { bewerbungAusLink, firmaTitelVorschlag } from "./actions";
import { MAX_TEXT } from "@/lib/uebernahme";
import { PORTAL_EINGABE } from "@/lib/jobportale";
import { merkStufeSetzen } from "./zug-actions";
import type { MerkStufe } from "@/lib/tracker-karte";

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

type Zustand = { brauchtEingabe: true; fuer: string; grund?: "portal_ohne_firma" } | { fehler: string } | { angelegt: string; vorhanden?: boolean; portal?: boolean } | null;

// Fenster nach "Anlegen": erscheint sofort; die Bewerbung steht nach unter einer Sekunde, der Rest läuft auf dem Server weiter.
function AngelegtFenster({ offen, laeuft, zustand, weiter }: { offen: boolean; laeuft: boolean; zustand: Zustand; weiter: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (offen && d && !d.open) d.showModal();
    if (!offen && d?.open) d.close();
  }, [offen]);
  const angelegt = zustand && "angelegt" in zustand ? zustand : null;
  return (
    <dialog ref={ref} className="archiv-dialog angelegt-fenster" aria-labelledby="angelegt-titel" onCancel={weiter}>
      <h2 id="angelegt-titel">{laeuft || !angelegt ? "Bewerbung wird angelegt …" : angelegt.vorhanden ? "Schon vorhanden" : "Bewerbung angelegt"}</h2>
      {angelegt?.vorhanden
        ? <p>Diese Stelle hattest du schon.</p>
        : angelegt?.portal
          ? <p>Du musst nicht warten. Das Ergebnis der Originalsuche steht in der Bewerbung. Du kannst diese Seite verlassen.</p>
          : <p>Du musst nicht warten. Firma, Titel und Anzeigentext ergänzt jobradar im Hintergrund, meist in 2–5 Minuten. Du kannst diese Seite verlassen.</p>}
      <div className="knopfreihe">
        {angelegt && <a className="knopf knopf-schmal" href={`/bewerbung/${angelegt.angelegt}`}>Zur Bewerbung</a>}
        <button type="button" className="knopf knopf-rand knopf-schmal" onClick={weiter}>Nächsten Link einfügen</button>
      </div>
    </dialog>
  );
}

export function LinkFormular() {
  const [url, setUrl] = useState("");
  const [firma, setFirma] = useState("");
  const [titel, setTitel] = useState("");
  const [text, setText] = useState("");
  const [fenster, setFenster] = useState(false);
  const [laeuft, starte] = useTransition();
  const [vorschlagFehler, setVorschlagFehler] = useState("");
  const erkennen = () => starte(async () => {
    const r = await firmaTitelVorschlag(text);
    if ("fehler" in r) return setVorschlagFehler(r.fehler);
    setVorschlagFehler(""); setFirma((f) => f || r.firma); setTitel((t) => t || r.titel); // Eingetipptes bleibt
  });
  const [zustand, aktion, anlegenLaeuft] = useActionState<Zustand, FormData>(
    async () => {
      const r = await bewerbungAusLink(url, firma, titel, text);
      if (!("angelegt" in r)) setFenster(false); // Fehler oder Rückfrage stehen im Formular
      return "brauchtEingabe" in r ? { ...r, fuer: url } : r;
    },
    null,
  );
  const weiter = () => { setFenster(false); setUrl(""); setFirma(""); setTitel(""); setText(""); };
  // Die Meldung gilt nur für den Link, für den gefragt wurde.
  const brauchtEingabe = zustand !== null && "brauchtEingabe" in zustand && zustand.fuer === url;
  return (
    <form action={aktion} className="formular linkform" onSubmit={() => setFenster(true)}>
      <AngelegtFenster offen={fenster} laeuft={anlegenLaeuft} zustand={zustand} weiter={weiter} />
      <label>Link zur Anzeige
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      </label>
      {brauchtEingabe && <p className="meldung info">{zustand.grund === "portal_ohne_firma" ? PORTAL_EINGABE : "Aus dem Link ist nichts erkennbar. Bitte Firma und Titel eintragen."}</p>}
      <p className="gedaempft">Mit Link wird übernommen, was sich daraus erkennen lässt; was du einträgst, geht vor. Ohne Link sind Firma und Titel Pflicht, außer du fügst den Anzeigentext ein.</p>
      <label>Firma
        <input value={firma} required={(!url.trim() && !text.trim()) || brauchtEingabe} onChange={(e) => setFirma(e.target.value)} />
      </label>
      <label>Titel
        <input value={titel} required={(!url.trim() && !text.trim()) || brauchtEingabe} onChange={(e) => setTitel(e.target.value)} />
      </label>
      <label>Anzeigentext (optional)
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_TEXT} rows={4} placeholder="Den ganzen Text der Anzeige hier einfügen…" />
      </label>
      <p className="gedaempft">Nur den Anzeigentext einfügen, keine eigenen Daten.</p>
      <button type="button" className="knopf knopf-rand knopf-schmal" disabled={!text.trim() || laeuft} onClick={erkennen}>{laeuft ? "Erkenne …" : "Firma und Titel aus Text erkennen"}</button>
      {vorschlagFehler && <p className="meldung fehler" role="alert">{vorschlagFehler}</p>}
      {zustand && "fehler" in zustand && <p className="meldung fehler" role="alert">{zustand.fehler}</p>}
      <SendeKnopf text="Anlegen" />
    </form>
  );
}

// Weiche Ausnahme bei offener Sperre ("Anzeige offline"): erst Knopf, dann Rückfrage (kein confirm()), dann die Aktion mit trotzdem = true.
// Aktionen, die statt zu springen {ok:false, fehler} liefern (Board-Züge), zeigen den Fehler hier an.
export function TrotzdemForm({ action, felder }: { action: (f: FormData) => Promise<unknown>; felder?: Record<string, string> }) {
  const [frage, setFrage] = useState(false);
  const [fehler, setFehler] = useState("");
  const textId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const zurueck = useRef(false); // Fokus nur nach Abbrechen zurückgeben, nicht beim ersten Anzeigen
  useEffect(() => {
    if (frage) formRef.current?.querySelector<HTMLButtonElement>("button[type=submit]")?.focus();
    else if (zurueck.current) { zurueck.current = false; startRef.current?.focus(); }
  }, [frage]);
  if (!frage) return <button ref={startRef} type="button" className="knopf knopf-rand knopf-schmal" onClick={() => setFrage(true)}>Schon beworben? Trotzdem eintragen</button>;
  return (
    <form ref={formRef} className="knopfreihe" role="group" aria-labelledby={textId} action={async (f) => {
      const r = await action(f);
      if (r && typeof r === "object" && "fehler" in r) setFehler(String(r.fehler));
    }}>
      <p id={textId}>Die Anzeige ist offline. Trotzdem als beworben eintragen?</p>
      {Object.entries(felder ?? {}).map(([n, w]) => <input key={n} type="hidden" name={n} value={w} />)}
      <SendeKnopf text="Ja, eintragen" klasse="knopf knopf-schmal" />
      <button type="button" className="knopf knopf-rand knopf-schmal" onClick={() => { setFehler(""); zurueck.current = true; setFrage(false); }}>Abbrechen</button>
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
    </form>
  );
}

// Einsortieren eines gemerkten Eintrags: ein Klick, der Knopf der aktuellen Gruppe fehlt.
const STUFE_KNOPF = [["gemerkt", "Gemerkt"], ["spaeter", "Für später"]] as const;
export function MerkKnoepfe({ id, stufe }: { id: string; stufe: MerkStufe }) {
  const [laeuft, starte] = useTransition();
  const [fehler, setFehler] = useState("");
  return (
    <span className="knopfreihe">
      {STUFE_KNOPF.filter(([s]) => s !== stufe).map(([s, text]) => (
        <button key={s} type="button" className="knopf knopf-rand knopf-schmal" disabled={laeuft}
          onClick={() => starte(async () => { const r = await merkStufeSetzen(id, s); setFehler("fehler" in r ? r.fehler : ""); })}>{text}</button>
      ))}
      {fehler && <span className="meldung fehler" role="alert">{fehler}</span>}
    </span>
  );
}
