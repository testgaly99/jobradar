import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { aktualisieren, anleitung, browserAus } from "@/lib/erweiterung-anleitung";
import erweiterung from "@/lib/erweiterung-version.json";
import { AdresseKopieren } from "./erweiterung";
import { createAdminClient } from "@/lib/supabase/admin";
import { kiStand, ladeAlle, sichererLink } from "@/lib/ki-stand";
import { aktuellerNutzer } from "@/lib/nutzer";
import { SendeKnopf } from "../bewerbungen/knoepfe";
import { selbstLoeschenErlaubt, nutzerZeilen } from "@/lib/nutzerliste";
import { STATUS, STATUS_LABEL } from "@/lib/bewerbung";
import { FELDER, FELD_TITEL, waehleFelder } from "@/lib/steckbrief";
import { begriffHinzufuegen, felderSpeichern, begriffEntfernen, kontoLoeschen, whitelistSetzen } from "./actions";

export default async function Seite({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const { fehler } = await searchParams;
  // Eigene Adresse aus der Anfrage: so steht keine Website-Adresse im Code (CLAUDE.md 4.6).
  const h = await headers();
  const adresse = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3002"}`;
  const browser = browserAus(h.get("user-agent"));
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
  // Nur für Admins, nur serverseitig: der Service-Key verlässt diesen Code nie. Ohne "text" (zu groß, nicht nötig).
  let ki: { stand: ReturnType<typeof kiStand>; weg: { id: string; unternehmen: string | null; titel: string | null; url: string | null }[]; wegAnzahl: number } | "fehler" | null = null;
  if (n?.admin) {
    try {
      const a = createAdminClient();
      const [offen, weg, anzahl] = await Promise.all([
        ladeAlle(async (von, bis) => {
          const r = await a.from("jobs").select("text_hash,ki_hash,ki_modell").eq("status", "offen").neq("text", "").order("id").range(von, bis);
          if (r.error) throw r.error;
          return r.data;
        }),
        // nur wirklich ausgeblendete: bei Whitelist-Firmen bleiben "nein"-Stellen sichtbar
        a.from("jobs").select("id,unternehmen,titel,url").eq("status", "offen").eq("studium", "nein").eq("sichtbar", false).order("unternehmen").limit(500),
        a.from("jobs").select("id", { count: "exact", head: true }).eq("status", "offen").eq("studium", "nein").eq("sichtbar", false),
      ]);
      ki = weg.error || anzahl.error ? "fehler" : { stand: kiStand(offen), weg: weg.data ?? [], wegAnzahl: anzahl.count ?? 0 };
    } catch { ki = "fehler"; }
  }
  // Whitelist (Migration 011): Fehler beim Lesen heißt meist, dass die Spalte noch fehlt.
  let whitelist: { name: string; whitelist: boolean | null }[] | "fehlt" | null = null;
  if (n?.admin) {
    try {
      const r = await createAdminClient().from("companies").select("name, whitelist").order("name");
      whitelist = r.error ? "fehlt" : (r.data ?? []);
    } catch { whitelist = "fehlt"; }
  }
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
      {ki && (
        <section className="abschnitt">
          <h2>KI-Auswertung</h2>
          {ki === "fehler" ? <p className="gedaempft">Der Stand konnte gerade nicht geladen werden.</p> : (
            <>
              <p>Noch {ki.stand.wartend} Anzeigen warten auf Auswertung.</p>
              {ki.stand.fehler > 0 && <p>{ki.stand.fehler} Anzeigen nicht auswertbar.</p>}
              <details className="klein">
                <summary>Ausgeblendet wegen Studium: nein ({ki.wegAnzahl})</summary>
                {ki.wegAnzahl > ki.weg.length && <p className="gedaempft klein">(die ersten {ki.weg.length})</p>}
                {ki.weg.length ? (
                  <ul className="ausgeblendet">
                    {ki.weg.map((j) => (
                      <li key={j.id}>{j.unternehmen}: {sichererLink(j.url)
                        ? <a href={sichererLink(j.url)!} target="_blank" rel="noopener noreferrer">{j.titel ?? j.url}</a> : j.titel}</li>
                    ))}
                  </ul>
                ) : <p className="gedaempft">Keine.</p>}
              </details>
            </>
          )}
        </section>
      )}
      {whitelist && (
        <section className="abschnitt" id="whitelist">
          <h2>Stellen ohne Studium trotzdem zeigen</h2>
          <p>Bei angehakten Firmen blendet jobradar keine Stelle wegen „Studium: nein“ aus. Das wirkt sofort für alle.</p>
          {whitelist === "fehlt" ? <p className="gedaempft">Migration 011 fehlt: bitte im Supabase SQL Editor einspielen.</p> : (
            <ul className="whitelist">
              {whitelist.map((f) => (
                <li key={f.name}>
                  <form action={whitelistSetzen}>
                    <input type="hidden" name="firma" value={f.name} />
                    <input type="hidden" name="wert" value={f.whitelist ? "aus" : "an"} />
                    <button className="knopf knopf-leise" type="submit" aria-pressed={!!f.whitelist}
                      aria-label={`${f.name}: ${f.whitelist ? "von der Whitelist nehmen" : "auf die Whitelist setzen"}`}>
                      <span aria-hidden="true">{f.whitelist ? "☑" : "☐"}</span> {f.name}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <section className="abschnitt">
        <h2>Browser-Erweiterung</h2>
        <p>Mit dem Knopf „Anzeige merken“ übernimmst du eine geöffnete Stellenanzeige mit einem Klick in deine Bewerbungen.</p>
        {browser === "mobil" ? <p className="gedaempft">{anleitung("mobil")[0]}</p> : (
          <>
            <p><a className="knopf knopf-schmal" href="/downloads/jobradar-erweiterung.zip" download>Erweiterung herunterladen (Version {erweiterung.version})</a></p>
            <ol>{anleitung(browser).map((s) => <li key={s}>{s}</li>)}</ol>
            <AdresseKopieren adresse={adresse} />
            <details>
              <summary>Aktualisieren</summary>
              <ol>{aktualisieren(browser).map((s) => <li key={s}>{s}</li>)}</ol>
            </details>
          </>
        )}
        <p className="gedaempft klein">Auf LinkedIn, StepStone und XING übernimmt die Erweiterung nichts.</p>
      </section>
      <section className="abschnitt">
        <h2>Meine Daten exportieren</h2>
        <p>Wir empfehlen dir, deine Bewerbungen vorher zu exportieren. Nach dem Löschen sind sie nicht wiederherstellbar.</p>
        <p><a className="knopf knopf-rand knopf-schmal" href="/export">Als Excel-Tabelle herunterladen</a></p>
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
