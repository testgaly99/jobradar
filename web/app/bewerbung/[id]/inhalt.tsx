import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ERGEBNIS_LABEL, KONTAKT_ART_LABEL, STATUS, STATUS_LABEL, datumDe, istUuid, zeitDe, type Abschnitt, type Status,
} from "@/lib/bewerbung";
import {
  abschnittSpeichern, bewerbungLoeschen, eintragLoeschen, interviewAnlegen, notizAnlegen, personAnlegen,
} from "@/app/bewerbungen/detail-actions";
import Abschnitte from "../../abschnitte";
import { leseAbschnitte } from "@/lib/anzeige";
import { DruckKnopf, LoeschForm, SendeKnopf } from "@/app/bewerbungen/knoepfe";
import Ungespeichert from "./ungespeichert";

type Row = Record<string, string | number | string[] | null>;
type Dok = { id: string; name: string | null; version_datum: string | null };
type Ereignis = { id: string; datum: string; alter_status: Status | null; neuer_status: Status | null; notiz: string | null };
type Person = { id: string; firma: string | null; name: string | null; rolle: string | null; email: string | null; telefon: string | null; linkedin: string | null; art: string | null };
type Interview = { id: string; datum: string | null; format: string | null; teilnehmer: string | null; fragen_gestellt: string | null; eigene_fragen: string | null; eindruck: string | null; aufgabe: string | null; aufgabe_frist: string | null };

const v = (x: unknown) => (x === null || x === undefined ? "" : String(x));
const sicher = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

function Text({ a, name, label, type = "text", gross }: { a: Row; name: string; label: string; type?: string; gross?: boolean }) {
  return (
    <label>{label}
      {gross ? <textarea name={name} rows={4} defaultValue={v(a[name])} /> : <input name={name} type={type} defaultValue={v(a[name])} />}
    </label>
  );
}

// Gemeinsamer Inhalt der ganzen Seite ([id]/page.tsx) und des Seitenfensters (@fenster/(.)[id]).
export default async function BewerbungInhalt({ id, fehler }: { id: string; fehler?: string }) {
  if (!istUuid(id)) notFound();
  const sb = await createClient();
  const { data: a } = await sb.from("applications").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();
  const [ev, pe, iv, dok] = await Promise.all([
    sb.from("application_events").select("id,datum,alter_status,neuer_status,notiz").eq("application_id", id).order("datum", { ascending: false }),
    sb.from("contacts").select("*").eq("application_id", id).order("name"),
    sb.from("interviews").select("*").eq("application_id", id).order("datum", { ascending: false }),
    sb.from("documents").select("id,name,art,version_datum").order("version_datum", { ascending: false }),
  ]);
  const row = a as Row;
  const events = (ev.data ?? []) as Ereignis[];
  const personen = (pe.data ?? []) as Person[];
  const interviews = (iv.data ?? []) as Interview[];
  const docs = (dok.data ?? []) as (Dok & { art: string | null })[];
  // B1: Kästen mit Inhalt sind offen, leere zugeklappt (eine Zeile statt eines leeren Formulars)
  const hat = (...felder: string[]) => felder.some((f) => { const x = row[f]; return x !== null && x !== undefined && x !== "" && !(Array.isArray(x) && x.length === 0); });
  const interesse = typeof row.interesse === "number" ? row.interesse : null;
  const blick: [string, React.ReactNode][] = [
    ...(row.naechster_schritt ? [["Nächster Schritt", `${v(row.naechster_schritt)}${row.naechster_schritt_faellig ? ` (bis ${datumDe(v(row.naechster_schritt_faellig))})` : ""}`] as [string, React.ReactNode]] : []),
    ...(row.beworben_am ? [["Beworben am", datumDe(v(row.beworben_am))] as [string, React.ReactNode]] : []),
    ...(interesse ? [["Interesse", <span key="i" className="sterne" role="img" aria-label={`${interesse} von 5`}>{"★".repeat(interesse)}{"☆".repeat(5 - interesse)}</span>] as [string, React.ReactNode]] : []),
    ...(row.gehalt_spanne_anzeige ? [["Gehalt laut Anzeige", v(row.gehalt_spanne_anzeige)] as [string, React.ReactNode]] : []),
    ...(personen.length ? [["Personen", String(personen.length)] as [string, React.ReactNode]] : []),
    ...(interviews.length ? [["Interviews", String(interviews.length)] as [string, React.ReactNode]] : []),
  ];
  const speichern = (ab: Abschnitt) => abschnittSpeichern.bind(null, id, ab);
  const link = sicher(row.link as string | null);
  const dokOptionen = (art: string) => (
    <>
      <option value="">keins</option>
      {docs.filter((d) => d.art === art).map((d) => (
        <option key={d.id} value={d.id}>{d.name || "Dokument"}{d.version_datum ? ` (${datumDe(d.version_datum)})` : ""}</option>
      ))}
    </>
  );

  return (
    <div className="bewerbung-seite" id="bewerbung-formulare">
      <Ungespeichert bereich="bewerbung-formulare" />
      <p className="kein-druck"><Link href="/bewerbungen">Alle Bewerbungen</Link></p>
      <h1 id="bewerbung-titel">{v(row.firma) || "(ohne Firma)"}: {v(row.titel)}</h1>
      <p className="chips kein-druck">
        <span className="chip" data-status={v(row.status)}>{STATUS_LABEL[row.status as Status]}</span>
        {row.ergebnis && <span className="chip">{ERGEBNIS_LABEL[row.ergebnis as string]}</span>}
        {link && <a href={link} target="_blank" rel="noopener noreferrer">Anzeige öffnen</a>}
      </p>
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
      {blick.length > 0 && (
        <section className="steckbrief karte kein-druck" aria-labelledby="blick-titel">
          <h2 id="blick-titel">Auf einen Blick</h2>
          <dl>{blick.map(([t, w]) => <div key={t}><dt>{t}</dt><dd>{w}</dd></div>)}</dl>
        </section>
      )}

      {/* Nur im Druck sichtbar: Stelle als Text, der Snapshot folgt darunter */}
      <section className="nur-druck">
        <p><strong>{v(row.firma)}</strong>: {v(row.titel)}</p>
        <p>{[row.standort, row.praesenzmodell, row.quelle, row.link].filter(Boolean).join(", ")}</p>
        {row.anforderungen && <pre className="snapshot">{v(row.anforderungen)}</pre>}
      </section>

      <div className="detail">
        <details className="karte kein-druck">
          <summary><h2>Stelle</h2></summary>
          <form action={speichern("stelle")} className="formular">
          <Text a={row} name="firma" label="Firma (Pflicht)" />
          <Text a={row} name="titel" label="Titel (Pflicht)" />
          <Text a={row} name="link" label="Link" type="url" />
          <Text a={row} name="quelle" label="Quelle" />
          <Text a={row} name="standort" label="Standort" />
          <Text a={row} name="praesenzmodell" label="Präsenzmodell" />
          <Text a={row} name="anforderungen" label="Anforderungen und Aufgaben (Auszug)" gross />
          <SendeKnopf text="Stelle speichern" />
        </form>
        </details>

        <details className="karte kein-druck" open>
          <summary><h2>Ablauf</h2></summary>
          <form action={speichern("ablauf")} className="formular">
          <label>Status
            <select name="status" defaultValue={v(row.status)}>
              {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </label>
          <Text a={row} name="naechster_schritt" label="Nächster Schritt" />
          <Text a={row} name="naechster_schritt_faellig" label="Fällig am" type="date" />
          <SendeKnopf text="Ablauf speichern" />
        </form>
        </details>

        <details className="karte kein-druck" open={hat("beworben_am", "bewerbungsweg", "referenznummer", "portal_hinweis", "cv_dokument_id", "anschreiben_dokument_id")}>
          <summary><h2>Bewerbung</h2></summary>
          <form action={speichern("bewerbung")} className="formular">
          <Text a={row} name="beworben_am" label="Beworben am" type="date" />
          <Text a={row} name="bewerbungsweg" label="Bewerbungsweg" />
          <Text a={row} name="referenznummer" label="Referenznummer" />
          <Text a={row} name="portal_hinweis" label="Hinweis zum Bewerberportal (kein Passwort!)" />
          <label>CV
            <select name="cv_dokument_id" defaultValue={v(row.cv_dokument_id)}>{dokOptionen("cv")}</select>
            <a href="/dokumente" className="klein">Dokument hochladen</a>
          </label>
          <label>Anschreiben
            <select name="anschreiben_dokument_id" defaultValue={v(row.anschreiben_dokument_id)}>{dokOptionen("anschreiben")}</select>
          </label>
          {docs.length === 0 && <p className="gedaempft klein">Noch keine Dokumente. <a href="/dokumente">Jetzt hochladen</a>.</p>}
          <SendeKnopf text="Bewerbung speichern" />
        </form>
        </details>

        <details className="karte kein-druck" open={hat("gehalt_spanne_anzeige", "gehalt_wunsch", "angebot_fix", "angebot_variabel", "angebot_urlaub", "angebot_benefits", "gehalt_aktuell_vergleich")}>
          <summary><h2>Gehalt</h2></summary>
          <form action={speichern("gehalt")} className="formular">
          <Text a={row} name="gehalt_spanne_anzeige" label="Spanne laut Anzeige" />
          <Text a={row} name="gehalt_wunsch" label="Eigener Wunsch" />
          <Text a={row} name="angebot_fix" label="Angebot: fix" />
          <Text a={row} name="angebot_variabel" label="Angebot: variabel" />
          <Text a={row} name="angebot_urlaub" label="Angebot: Urlaub" />
          <Text a={row} name="angebot_benefits" label="Angebot: Benefits" />
          <Text a={row} name="gehalt_aktuell_vergleich" label="Vergleich zum aktuellen Gehalt" />
          <SendeKnopf text="Gehalt speichern" />
        </form>
        </details>

        <details className="karte kein-druck" open={hat("starttermin", "kuendigungsfrist", "referenzen")}>
          <summary><h2>Rahmen</h2></summary>
          <form action={speichern("rahmen")} className="formular">
          <Text a={row} name="starttermin" label="Starttermin" type="date" />
          <Text a={row} name="kuendigungsfrist" label="Kündigungsfrist" />
          <Text a={row} name="referenzen" label="Referenzen" gross />
          <SendeKnopf text="Rahmen speichern" />
        </form>
        </details>

        <details className="karte kein-druck" open={hat("ergebnis", "absagegrund", "feedback", "rueckzug_grund")}>
          <summary><h2>Ergebnis</h2></summary>
          <form action={speichern("ergebnis")} className="formular">
          <label>Ergebnis
            <select name="ergebnis" defaultValue={v(row.ergebnis)}>
              <option value="">offen</option>
              {Object.entries(ERGEBNIS_LABEL).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
          </label>
          <Text a={row} name="absagegrund" label="Absagegrund" />
          <Text a={row} name="feedback" label="Feedback" gross />
          <Text a={row} name="rueckzug_grund" label="Grund für das Zurückziehen" />
          <SendeKnopf text="Ergebnis speichern" />
        </form>
        </details>

        <details className="karte kein-druck" open={hat("interesse", "tags", "notizen")}>
          <summary><h2>Einschätzung</h2></summary>
          <form action={speichern("einschaetzung")} className="formular">
          <label>Interesse
            <select name="interesse" defaultValue={v(row.interesse)}>
              <option value="">keine Angabe</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>Tags (mit Komma getrennt)
            <input name="tags" defaultValue={Array.isArray(row.tags) ? row.tags.join(", ") : ""} />
          </label>
          <Text a={row} name="notizen" label="Notizen" gross />
          <SendeKnopf text="Einschätzung speichern" />
        </form>
        </details>
      </div>

      <details className="karte block kein-druck" open={personen.length > 0}>
        <summary><h2>Personen</h2></summary>
        <ul className="eintraege">
          {personen.map((p) => (
            <li key={p.id}>
              <div>
                <strong>{p.name}</strong> {p.art && <span className="chip">{KONTAKT_ART_LABEL[p.art]}</span>}
                <p className="klein">{[p.rolle, p.firma, p.email, p.telefon, p.linkedin].filter(Boolean).join(", ")}</p>
              </div>
              <LoeschForm action={eintragLoeschen.bind(null, id, "contacts", p.id)} frage="Person löschen?" />
            </li>
          ))}
          {personen.length === 0 && <li className="gedaempft">Noch keine Personen.</li>}
        </ul>
        <details className="hinzufuegen">
        <summary className="knopf knopf-rand knopf-schmal">+ Person hinzufügen</summary>
        <form action={personAnlegen.bind(null, id)} className="formular">
          <label>Name (Pflicht)<input name="name" required /></label>
          <label>Art
            <select name="art" defaultValue="ansprechpartner">
              {Object.entries(KONTAKT_ART_LABEL).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
          </label>
          <label>Rolle<input name="rolle" /></label>
          <label>Firma<input name="firma" /></label>
          <label>E-Mail<input name="email" type="email" /></label>
          <label>Telefon<input name="telefon" type="tel" /></label>
          <label>LinkedIn<input name="linkedin" /></label>
          <SendeKnopf text="Person speichern" />
        </form>
        </details>
      </details>

      <details className="karte block kein-druck" open={interviews.length > 0}>
        <summary><h2>Interviews und Aufgaben</h2></summary>
        <ul className="eintraege">
          {interviews.map((i) => (
            <li key={i.id}>
              <div>
                <strong>{i.datum ? zeitDe(i.datum) : "Ohne Datum"}</strong> {i.format && <span className="chip">{i.format}</span>}
                {i.teilnehmer && <p className="klein">Teilnehmer: {i.teilnehmer}</p>}
                {i.fragen_gestellt && <p className="klein">Fragen: {i.fragen_gestellt}</p>}
                {i.eigene_fragen && <p className="klein">Eigene Fragen: {i.eigene_fragen}</p>}
                {i.eindruck && <p className="klein">Eindruck: {i.eindruck}</p>}
                {i.aufgabe && <p className="klein">Aufgabe: {i.aufgabe}{i.aufgabe_frist && ` (Frist ${datumDe(i.aufgabe_frist)})`}</p>}
              </div>
              <LoeschForm action={eintragLoeschen.bind(null, id, "interviews", i.id)} frage="Interview löschen?" />
            </li>
          ))}
          {interviews.length === 0 && <li className="gedaempft">Noch keine Interviews.</li>}
        </ul>
        <details className="hinzufuegen">
        <summary className="knopf knopf-rand knopf-schmal">+ Interview hinzufügen</summary>
        <form action={interviewAnlegen.bind(null, id)} className="formular">
          <label>Datum und Uhrzeit<input name="datum" type="datetime-local" /></label>
          <label>Format<input name="format" placeholder="z. B. Video oder vor Ort…" /></label>
          <label>Teilnehmer<input name="teilnehmer" /></label>
          <label>Gestellte Fragen<textarea name="fragen_gestellt" rows={3} /></label>
          <label>Eigene Fragen<textarea name="eigene_fragen" rows={3} /></label>
          <label>Eindruck<textarea name="eindruck" rows={3} /></label>
          <label>Case- oder Testaufgabe<input name="aufgabe" /></label>
          <label>Frist der Aufgabe<input name="aufgabe_frist" type="date" /></label>
          <SendeKnopf text="Interview speichern" />
        </form>
        </details>
      </details>

      <details className="karte block kein-druck" open>
        <summary><h2>Verlauf</h2></summary>
        <ul className="eintraege">
          {events.map((e) => (
            <li key={e.id}>
              <div>
                <strong>{zeitDe(e.datum)}</strong>
                {e.neuer_status && <p className="klein">{e.alter_status ? `${STATUS_LABEL[e.alter_status]} → ` : ""}{STATUS_LABEL[e.neuer_status]}</p>}
                {e.notiz && <p className="klein umbruch">{e.notiz}</p>}
              </div>
            </li>
          ))}
          {events.length === 0 && <li className="gedaempft">Noch kein Verlauf.</li>}
        </ul>
        <form action={notizAnlegen.bind(null, id)} className="formular">
          <label>Notiz zum Verlauf<textarea name="notiz" rows={3} required /></label>
          <SendeKnopf text="Notiz hinzufügen" />
        </form>
      </details>

      <details className="karte block">
        <summary><h2>Snapshot der Anzeige</h2></summary>
        <div className="kopfzeile"><DruckKnopf /></div>
        {row.snapshot_text || (a as { snapshot_abschnitte?: unknown }).snapshot_abschnitte
          ? <Abschnitte abschnitte={leseAbschnitte((a as { snapshot_abschnitte?: unknown }).snapshot_abschnitte)} text={v(row.snapshot_text)} />
          : <p className="gedaempft">Kein Snapshot gespeichert.</p>}
      </details>

      <section className="block kein-druck">
        <LoeschForm action={bewerbungLoeschen.bind(null, id)} frage="Diese Bewerbung mit allem Zubehör endgültig löschen?" text="Bewerbung löschen" />
      </section>
    </div>
  );
}
