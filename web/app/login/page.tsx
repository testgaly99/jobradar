"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fehlerText } from "@/lib/fehler";

type Modus = "anmelden" | "registrieren" | "vergessen";
const TITEL: Record<Modus, string> = { anmelden: "Anmelden", registrieren: "Registrieren", vergessen: "Passwort vergessen" };

export default function Login() {
  const [modus, setModus] = useState<Modus>("anmelden");
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState("");
  const [info, setInfo] = useState("");
  const [laedt, setLaedt] = useState(false);

  function wechsle(m: Modus) {
    setModus(m);
    setFehler("");
    setInfo("");
  }

  async function google() {
    setFehler("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setFehler(fehlerText(error));
  }

  async function senden(e: React.FormEvent) {
    e.preventDefault();
    setFehler("");
    setInfo("");
    setLaedt(true);
    const auth = createClient().auth;
    if (modus === "anmelden") {
      const { error } = await auth.signInWithPassword({ email, password: passwort });
      if (error) setFehler(fehlerText(error));
      else location.href = "/"; // harter Wechsel, damit Proxy und Kopfzeile die neue Sitzung sehen
    } else if (modus === "registrieren") {
      const { data, error } = await auth.signUp({ email, password: passwort, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      if (error) setFehler(fehlerText(error));
      else if (data.session) location.href = "/";
      else setInfo("Fast geschafft: Wir haben dir eine E-Mail geschickt. Bestätige sie mit dem Link darin.");
    } else {
      const { error } = await auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/neues-passwort` });
      if (error) setFehler(fehlerText(error));
      else setInfo("Wenn es ein Konto mit dieser E-Mail gibt, ist ein Link zum Zurücksetzen unterwegs.");
    }
    setLaedt(false);
  }

  return (
    <div className="karte schmal">
      <h1>Jobradar</h1>
      <button type="button" className="knopf knopf-rand" onClick={google}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
          <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        Mit Google anmelden
      </button>
      <p className="trenner"><span>oder mit E-Mail</span></p>
      <form onSubmit={senden} className="formular">
        <h2>{TITEL[modus]}</h2>
        <label>E-Mail
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {modus !== "vergessen" && (
          <label>Passwort
            <input type="password" required minLength={8} autoComplete={modus === "anmelden" ? "current-password" : "new-password"} value={passwort} onChange={(e) => setPasswort(e.target.value)} />
          </label>
        )}
        {fehler && <p role="alert" className="meldung fehler">{fehler}</p>}
        {info && <p role="status" className="meldung info">{info}</p>}
        <button className="knopf" type="submit" disabled={laedt}>{laedt ? "Bitte warten …" : TITEL[modus]}</button>
      </form>
      <p className="wechsel">
        {modus !== "anmelden" && <button type="button" className="link" onClick={() => wechsle("anmelden")}>Zurück zur Anmeldung</button>}
        {modus === "anmelden" && (
          <>
            <button type="button" className="link" onClick={() => wechsle("registrieren")}>Registrieren</button>
            <button type="button" className="link" onClick={() => wechsle("vergessen")}>Passwort vergessen?</button>
          </>
        )}
      </p>
    </div>
  );
}
