"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dateiname } from "@/lib/export";
import { ANLAGE_ARTEN } from "@/lib/dokumente";
import { cvTextSpeichern, dokumentAnlegen, dokumentLoeschen, einwilligen } from "./actions";
import { LoeschForm } from "../bewerbungen/knoepfe";

const MAX = 50 * 1024 * 1024;
// Wortlaut aus dem Design (Phase 6, Abschnitt „Einwilligung“); kein Rechtsrat, Prüfung vor öffentlichem Start (Q40).
export const EINWILLIGUNG = "Ich willige ein, dass jobradar meinen Lebenslauf speichert und mit Stellenanzeigen abgleicht. Er kann Angaben über Gesundheit, Religion o. Ä. enthalten (besondere Kategorien, Art. 9 DSGVO). Widerruf jederzeit durch Löschen des CV.";

export function UploadFormular({ einwilligung }: { einwilligung: boolean }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [art, setArt] = useState("cv");

  async function senden(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const datei = f.get("datei") as File;
    if (!datei || datei.size === 0) return setFehler("Bitte wähle eine Datei.");
    if (datei.size > MAX) return setFehler("Die Datei ist größer als 50 MB.");
    setFehler(""); setLaeuft(true);
    try {
      if (art === "cv" && !einwilligung) {
        const e = await einwilligen();
        if (e.fehler) return setFehler(e.fehler);
      }
      const sb = createClient();
      const { data: c } = await sb.auth.getClaims();
      const uid = c?.claims?.sub;
      if (!uid) return setFehler("Bitte melde dich an.");
      const pfad = `${uid}/${crypto.randomUUID()}-${dateiname(datei.name)}`;
      const { error } = await sb.storage.from("dokumente").upload(pfad, datei);
      if (error) return setFehler("Hochladen hat nicht geklappt.");
      const r = await dokumentAnlegen(String(f.get("art")), String(f.get("name")), String(f.get("version_datum")), pfad, art === "anlage" ? String(f.get("anlage_art") ?? "") : undefined);
      if (r.fehler) { await sb.storage.from("dokumente").remove([pfad]); return setFehler(r.fehler); }
      form.reset();
      setArt("cv");
      router.refresh();
    } catch {
      setFehler("Hochladen hat nicht geklappt.");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <form onSubmit={senden} className="formular linkform">
      <label>Art
        <select name="art" value={art} onChange={(e) => setArt(e.target.value)}>
          <option value="cv">Lebenslauf</option>
          <option value="anschreiben">Anschreiben</option>
          <option value="anlage">Anlage</option>
        </select>
      </label>
      {art === "anlage" && (
        <label>Art der Anlage
          <select name="anlage_art" required defaultValue="">
            <option value="" disabled>Bitte wählen</option>
            {Object.entries(ANLAGE_ARTEN).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
        </label>
      )}
      {art === "cv" && !einwilligung && (
        <label className="meldung hinweis"><span><input type="checkbox" name="einwilligung" required /> {EINWILLIGUNG}</span></label>
      )}
      <label>Versionsname
        <input name="name" required maxLength={120} placeholder="z. B. CV Produktmanagement v3…" />
      </label>
      <label>Versionsdatum
        <input name="version_datum" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </label>
      <label>Datei (höchstens 50 MB)
        <input name="datei" type="file" required />
      </label>
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
      <button className="knopf" type="submit" disabled={laeuft}>{laeuft ? "Lade hoch …" : "Hochladen"}</button>
    </form>
  );
}

// Löschen mit Rückfrage; Fehlermeldung (z. B. "wird noch verwendet") erscheint darunter.
export function DokumentLoeschen({ id }: { id: string }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  return (
    <>
      <LoeschForm frage="Dokument wirklich löschen?" action={async () => {
        const r = await dokumentLoeschen(id);
        if (r.fehler) setFehler(r.fehler); else router.refresh();
      }} />
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
    </>
  );
}

// Ausgelesener CV-Text: Vorschau und Korrektur; leer = „Kein Text erkannt“ (z. B. Scan ohne Textebene).
export function CvText({ id, text, herkunft }: { id: string; text: string | null; herkunft: string | null }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [gespeichert, setGespeichert] = useState(false);
  return (
    <details>
      <summary className="klein">
        {text === null ? "Text noch nicht ausgelesen" : text ? `Ausgelesener Text${herkunft === "korrigiert" ? " (korrigiert)" : ""}` : "Kein Text erkannt"}
      </summary>
      <form className="formular" action={async (f) => {
        const r = await cvTextSpeichern(id, f);
        setFehler(r.fehler ?? ""); setGespeichert(!r.fehler);
        if (!r.fehler) router.refresh();
      }}>
        <label>Text des Lebenslaufs<textarea name="text" rows={12} defaultValue={text ?? ""} onChange={() => setGespeichert(false)} /></label>
        {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
        {gespeichert && <p className="meldung hinweis" role="status">Gespeichert. Der nächste Abgleich nutzt diesen Text.</p>}
        <button className="knopf knopf-rand knopf-schmal" type="submit">Korrigieren</button>
      </form>
    </details>
  );
}
