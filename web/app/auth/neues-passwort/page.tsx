"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fehlerText } from "@/lib/fehler";

export default function NeuesPasswort() {
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState("");
  const [fertig, setFertig] = useState(false);

  async function senden(e: React.FormEvent) {
    e.preventDefault();
    setFehler("");
    const { error } = await createClient().auth.updateUser({ password: passwort });
    if (error) setFehler(fehlerText(error));
    else setFertig(true);
  }

  return (
    <div className="karte schmal">
      <h1>Neues Passwort</h1>
      {fertig ? (
        <p role="status" className="meldung info">Passwort geändert. <a href="/">Weiter zu Jobradar</a></p>
      ) : (
        <form onSubmit={senden} className="formular">
          <label>Neues Passwort
            <input type="password" required minLength={8} autoComplete="new-password" value={passwort} onChange={(e) => setPasswort(e.target.value)} />
          </label>
          {fehler && <p role="alert" className="meldung fehler">{fehler}</p>}
          <button className="knopf" type="submit">Passwort speichern</button>
        </form>
      )}
    </div>
  );
}
