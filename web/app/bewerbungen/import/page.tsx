import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Dieser GET zeigt nur den Zustand. Er übernimmt keine Daten aus URL oder Fragment.
export default async function Seite() {
  const sb = await createClient();
  const { data, error } = await sb.auth.getClaims();
  const angemeldet = !error && !!data?.claims?.sub;
  return (
    <div className="karte">
      <h1>Stelle übernehmen</h1>
      <p id="stellen-import-status" role="status" aria-live="polite" data-import-status={angemeldet ? "bereit" : "anmeldung-noetig"}>
        {angemeldet ? "Bereit für die Übernahme aus dem Jobradar-Browserknopf." : "Bitte melde dich zuerst bei Jobradar an und klicke danach erneut auf den Browserknopf."}
      </p>
      <p>Übernommene Stellen erscheinen als „Gemerkt“ ohne Bewerbungsdatum. Vorhandene Bewerbungen bleiben erhalten.</p>
      <Link href="/bewerbungen" className="knopf knopf-rand">Meine Bewerbungen öffnen</Link>
    </div>
  );
}
