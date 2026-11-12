"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dateiname } from "@/lib/export";
import { dokumentAnlegen, dokumentLoeschen } from "./actions";
import { LoeschForm } from "../bewerbungen/knoepfe";

const MAX = 50 * 1024 * 1024;

export function UploadFormular() {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  async function senden(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const datei = f.get("datei") as File;
    if (!datei || datei.size === 0) return setFehler("Bitte wähle eine Datei.");
    if (datei.size > MAX) return setFehler("Die Datei ist größer als 50 MB.");
    setFehler(""); setLaeuft(true);
    try {
      const sb = createClient();
      const { data: c } = await sb.auth.getClaims();
      const uid = c?.claims?.sub;
      if (!uid) return setFehler("Bitte melde dich an.");
      const pfad = `${uid}/${crypto.randomUUID()}-${dateiname(datei.name)}`;
      const { error } = await sb.storage.from("dokumente").upload(pfad, datei);
      if (error) return setFehler("Hochladen hat nicht geklappt.");
      const r = await dokumentAnlegen(String(f.get("art")), String(f.get("name")), String(f.get("version_datum")), pfad);
      if (r.fehler) { await sb.storage.from("dokumente").remove([pfad]); return setFehler(r.fehler); }
      form.reset();
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
        <select name="art" defaultValue="cv">
          <option value="cv">Lebenslauf</option>
          <option value="anschreiben">Anschreiben</option>
          <option value="anlage">Anlage</option>
        </select>
      </label>
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
