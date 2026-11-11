import { createClient } from "@/lib/supabase/server";
import { aktuellerNutzer } from "@/lib/nutzer";
import { SendeKnopf } from "../bewerbungen/knoepfe";
import { selbstLoeschenErlaubt, nutzerZeilen } from "@/lib/nutzerliste";
import { STATUS, STATUS_LABEL } from "@/lib/bewerbung";
import { FELDER, FELD_TITEL, waehleFelder } from "@/lib/steckbrief";
import { begriffHinzufuegen, felderSpeichern, begriffEntfernen, kontoLoeschen } from "./actions";

export default async function Seite({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const { fehler } = await searchParams;
  const n = await aktuellerNutzer();
  const verboten = selbstLoeschenErlaubt({ istAdmin: !!n?.admin, adminEnv: process.env.ADMIN_EMAIL });
  const sb = await createClient();
  const { data: u } = await sb.auth.getUser();
  const z = u.user ? nutzerZeilen([u.user])[0] : null;
  // RLS-Client: zählt nur eigene Bewerbungen. Pro Status eine Zählabfrage (6 kleine Kopf-Abfragen).
  const zahlen = await Promise.all(STATUS.map(async (s) => {
    const { count } = await sb.from("applications").select("id", { count: "exact", head: true }).eq("status", s);
    return [s, count ?? 0] as const;
  }));
  const { data: punkte, error: punkteFehler } = await sb.from("wichtige_punkte").select("id,begriff").order("erstellt_am");
  const fz = await sb.from("listen_felder").select("felder").maybeSingle();
  const gewaehlt = waehleFelder(fz.error ? null : fz.data?.felder);
  return (
    <div className="karte">
      <h1>Konto</h1>
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
      {z && (
        <dl className="angaben">
          {z.name && <><dt>Name</dt><dd>{z.name}</dd></>}
          <dt>E-Mail</dt><dd>{z.email}</dd>
          <dt>Anmeldeart</dt><dd>{z.istGoogle ? "Google" : "E-Mail"}</dd>
          <dt>Dabei seit</dt><dd>{z.dabeiSeit}</dd>
        </dl>
      )}
      <section className="abschnitt">
        <h2>Meine Bewerbungen nach Status</h2>
        <dl className="zahlen">{zahlen.map(([s, c]) => <div key={s}><dt>{STATUS_LABEL[s]}</dt><dd>{c}</dd></div>)}</dl>
      </section>
      <section className="abschnitt">
        <h2>Was mir bei einer Stelle wichtig ist</h2>
        {punkteFehler ? <p className="gedaempft">{["42P01", "PGRST205"].includes(punkteFehler.code) ? "Verfügbar nach Migration 005" : "Die Begriffe konnten gerade nicht geladen werden."}</p> : (
          <>
            {punkte?.length ? (
              <ul className="chips begriffe">
                {punkte.map((p) => (
                  <li key={p.id}>{p.begriff}
                    <form action={begriffEntfernen.bind(null, p.id)}><button className="knopf knopf-leise" type="submit" aria-label={`${p.begriff} entfernen`}>×</button></form>
                  </li>
                ))}
              </ul>
            ) : <p className="gedaempft">Noch keine Begriffe.</p>}
            <form action={begriffHinzufuegen} className="formular">
              <label>Begriff hinzufügen
                <input name="begriff" required minLength={2} maxLength={60} autoComplete="off" />
              </label>
              <SendeKnopf text="Hinzufügen" klasse="knopf knopf-rand knopf-schmal" />
            </form>
          </>
        )}
      </section>
      <section className="abschnitt">
        <h2>Kurz<wbr />beschreibung in der Stellenliste</h2>
        {fz.error && !["42P01", "PGRST205"].includes(fz.error.code) ? <p className="gedaempft">Die Auswahl konnte gerade nicht geladen werden.</p> : (
          <form action={felderSpeichern} className="formular">
            <fieldset className="felderwahl">
              <legend>Welche Angaben stehen unter jeder Stelle?</legend>
              {FELDER.map((f) => (
                <label key={f} className="option">
                  <input type="checkbox" name="felder" value={f} defaultChecked={gewaehlt.includes(f)} />
                  <span>{FELD_TITEL[f]}</span>
                </label>
              ))}
            </fieldset>
            {fz.error && <p className="gedaempft klein">Speichern geht erst nach Migration 005. Bis dahin gilt die Standardauswahl.</p>}
            <SendeKnopf text="Auswahl speichern" klasse="knopf knopf-rand knopf-schmal" />
          </form>
        )}
      </section>
      <section className="abschnitt">
        <h2>Meine Daten exportieren</h2>
        <p>Wir empfehlen dir, deine Bewerbungen vorher zu exportieren. Nach dem Löschen sind sie nicht wiederherstellbar.</p>
        <p><a className="knopf knopf-rand knopf-schmal" href="/export">Excel-Tabelle (CSV) herunterladen</a></p>
        {verboten ? (
          <p className="klein gedaempft">{verboten}{n?.admin && " Es endet erst, wenn die Website und die Datenbank entfernt werden."}</p>
        ) : (
          <details className="klein">
            <summary>Konto löschen</summary>
            <p>Dabei wird alles gelöscht:</p>
            <ul>
              <li>Bewerbungen</li>
              <li>Kontakte</li>
              <li>Interviews</li>
              <li>Verlauf</li>
              <li>Dokumente samt Dateien</li>
              <li>Wichtige Begriffe</li>
            </ul>
            <form action={kontoLoeschen} className="formular">
              <label>Tippe LÖSCHEN ein
                <input name="bestaetigung" required autoComplete="off" />
              </label>
              <SendeKnopf text="Konto endgültig löschen" klasse="knopf knopf-gefahr" />
            </form>
          </details>
        )}
      </section>
    </div>
  );
}
