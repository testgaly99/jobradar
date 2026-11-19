"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PLATZHALTER } from "@/lib/anschreiben";
import { MAX_VORLAGE } from "@/lib/unterlagen";
import { LoeschForm, SendeKnopf } from "../bewerbungen/knoepfe";
import { vorlageLoeschen, vorlageSpeichern } from "./actions";

export type Vorlage = { id: string; name: string; betreff: string; text: string };
const MAX_DOCX = 5 * 1024 * 1024;

export function Vorlagen({ vorlagen }: { vorlagen: Vorlage[] }) {
  const [offen, setOffen] = useState<string | null>(null); // "neu" oder id
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  return (
    <>
      {vorlagen.length === 0 && offen !== "neu" && <p className="gedaempft">Noch keine Vorlagen.</p>}
      <ul className="eintraege">
        {vorlagen.map((v) => (
          <li key={v.id}>
            {offen === v.id ? <Editor vorlage={v} fertig={() => setOffen(null)} /> : (
              <>
                <div><strong>{v.name}</strong><p className="gedaempft klein">{v.betreff}</p></div>
                <div>
                  <button className="knopf knopf-rand knopf-schmal" type="button" onClick={() => setOffen(v.id)}>Bearbeiten</button>
                  <LoeschForm frage={`Vorlage „${v.name}“ löschen?`} action={async () => {
                    const r = await vorlageLoeschen(v.id);
                    if (r.fehler) setFehler(r.fehler); else router.refresh();
                  }} />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
      {offen === "neu" ? <Editor vorlage={null} fertig={() => setOffen(null)} />
        : <button className="knopf knopf-rand knopf-schmal" type="button" onClick={() => setOffen("neu")}>Neue Vorlage</button>}
    </>
  );
}

function Editor({ vorlage, fertig }: { vorlage: Vorlage | null; fertig: () => void }) {
  const router = useRouter();
  const feld = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(vorlage?.text ?? "");
  const [fehler, setFehler] = useState("");
  const [liest, setLiest] = useState(false);

  // Nur der Text wird übernommen; die Word-Datei selbst wird nicht hochgeladen.
  async function ausWord(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    e.target.value = "";
    if (!datei) return;
    if (!datei.name.toLowerCase().endsWith(".docx")) return setFehler("Bitte in Word als .docx speichern");
    if (datei.size > MAX_DOCX) return setFehler("Die Word-Datei ist größer als 5 MB.");
    setFehler(""); setLiest(true);
    try {
      const { textAusDocx } = await import("@/lib/brief-datei");
      setText(await textAusDocx(await datei.arrayBuffer()));
    } catch {
      setFehler("Die Word-Datei konnte nicht gelesen werden.");
    } finally { setLiest(false); }
  }

  function einfuegen(p: string) {
    const t = feld.current;
    const a = t?.selectionStart ?? text.length, b = t?.selectionEnd ?? text.length;
    setText(text.slice(0, a) + p + text.slice(b));
    requestAnimationFrame(() => { t?.focus(); t?.setSelectionRange(a + p.length, a + p.length); });
  }

  async function speichern(f: FormData) {
    const r = await vorlageSpeichern(vorlage?.id ?? null, f);
    if (r.fehler) return setFehler(r.fehler);
    fertig(); router.refresh();
  }

  return (
    <form action={speichern} className="formular">
      <label>Name der Vorlage
        <input name="name" required maxLength={120} defaultValue={vorlage?.name ?? ""} placeholder="z. B. Standard Finanzen…" />
      </label>
      <label>Betreff
        <input name="betreff" maxLength={300} defaultValue={vorlage?.betreff ?? "Bewerbung als {{stelle}}"} />
      </label>
      <label>Aus Word-Datei übernehmen (.docx, höchstens 5 MB)
        <input type="file" accept=".docx" onChange={ausWord} disabled={liest} />
      </label>
      <label>Text
        <textarea ref={feld} name="text" rows={14} required maxLength={MAX_VORLAGE} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div>
        <p className="gedaempft klein">Platzhalter einfügen (an der Cursorposition):</p>
        <ul className="chips">
          {PLATZHALTER.map((p) => <li key={p}><button className="knopf knopf-rand knopf-schmal" type="button" onClick={() => einfuegen(p)}>{p}</button></li>)}
        </ul>
      </div>
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
      <div className="aktionsreihe">
        <SendeKnopf text="Vorlage speichern" warte="Speichere …" />
        <button className="knopf knopf-leise" type="button" onClick={fertig}>Abbrechen</button>
      </div>
    </form>
  );
}
