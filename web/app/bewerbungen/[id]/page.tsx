import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ERGEBNIS_LABEL, KONTAKT_ART_LABEL, STATUS, STATUS_LABEL, datumDe, istUuid, zeitDe, type Abschnitt, type Status,
} from "@/lib/bewerbung";
import {
  abschnittSpeichern, bewerbungLoeschen, eintragLoeschen, interviewAnlegen, notizAnlegen, personAnlegen,
} from "../detail-actions";
import { DruckKnopf, LoeschForm, SendeKnopf } from "../knoepfe";

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

export default async function Seite({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fehler?: string }> }) {
  const { id } = await params;
  const { fehler } = await searchParams;
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
  const speichern = (ab: Abschnitt) => abschnittSpeichern.bind(null, id, ab);
  const link = sicher(row.link as string | null);
  const dokOptionen = (art: string) => (
    <>
      <option value="">– keins –</option>
      {docs.filter((d) => d.art === art).map((d) => (
        <option key={d.id} value={d.id}>{d.name || "Dokument"}{d.version_datum ? ` (${datumDe(d.version_datum)})` : ""}</option>
      ))}
    </>
  );

  return (
    <>
      <p className="kein-druck"><Link href="/bewerbungen">← Alle Bewerbungen</Link></p>
      <h1>{v(row.firma) || "(ohne Firma)"}: {v(row.titel)}</h1>
      <p className="chips kein-druck">
        <span className="chip">{STATUS_LABEL[row.status as Status]}</span>
        {row.ergebnis && <span className="chip">{ERGEBNIS_LABEL[row.ergebnis as string]}</span>}
        {link && <a href={link} target="_blank" rel="noopener noreferrer">Anzeige öffnen</a>}
      </p>
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}

      {/* Nur im Druck sichtbar: Stelle als Text, der Snapshot folgt darunter */}
      <section className="nur-druck">
        <p><strong>{v(row.firma)}</strong>: {v(row.titel)}</p>
        <p>{[row.standort, row.praesenzmodell, row.quelle, row.link].filter(Boolean).join(" · ")}</p>
        {row.anforderungen && <pre className="snapshot">{v(row.anforderungen)}</pre>}
      </section>

      <div className="detail">
        <form action={speichern("stelle")} className="karte formular kein-druck">
          <h2>Stelle</h2>
          <Text a={row} name="firma" label="Firma (Pflicht)" />
          <Text a={row} name="titel" label="Titel (Pflicht)" />
          <Text a={row} name="link" label="Link" type="url" />
          <Text a={row} name="quelle" label="Quelle" />
          <Text a={row} name="standort" label="Standort" />
          <Text a={row} name="praesenzmodell" label="Präsenzmodell" />
          <Text a={row} name="anforderungen" label="Anforderungen und Aufgaben (Auszug)" gross />
          <SendeKnopf text="Stelle speichern" />
        </form>

        <form action={speichern("ablauf")} className="karte formular kein-druck">
          <h2>Ablauf</h2>
          <label>Status
            <select name="status" defaultValue={v(row.status)}>
              {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </label>
          <Text a={row} name="naechster_schritt" label="Nächster Schritt" />
          <Text a={row} name="naechster_schritt_faellig" label="Fällig am" type="date" />
          <SendeKnopf text="Ablauf speichern" />
        </form>

        <form action={speichern("bewerbung")} className="karte formular kein-druck">
          <h2>Bewerbung</h2>
          <Text a={row} name="beworben_am" label="Beworben am" type="date" />
          <Text a={row} name="bewerbungsweg" label="Bewerbungsweg" />
          <Text a={row} name="referenznummer" label="Referenznummer" />
          <Text a={row} name="portal_hinweis" label="Hinweis zum Bewerberportal (kein Passwort!)" />
          <label>CV
            <select name="cv_dokument_id" defaultValue={v(row.cv_dokument_id)}>{dokOptionen("cv")}</select>
          </label>
          <label>Anschreiben
            <select name="anschreiben_dokument_id" defaultValue={v(row.anschreiben_dokument_id)}>{dokOptionen("anschreiben")}</select>
          </label>
          {docs.length === 0 && <p className="gedaempft klein">Noch keine Dokumente. <a href="/dokumente">Jetzt hochladen</a>.</p>}
          <SendeKnopf text="Bewerbung speichern" />
        </form>

        <form action={speichern("gehalt")} className="karte formular kein-druck">
          <h2>Gehalt</h2>
          <Text a={row} name="gehalt_spanne_anzeige" label="Spanne laut Anzeige" />
          <Text a={row} name="gehalt_wunsch" label="Eigener Wunsch" />
          <Text a={row} name="angebot_fix" label="Angebot: fix" />
          <Text a={row} name="angebot_variabel" label="Angebot: variabel" />
          <Text a={row} name="angebot_urlaub" label="Angebot: Urlaub" />
          <Text a={row} name="angebot_benefits" label="Angebot: Benefits" />
          <Text a={row} name="gehalt_aktuell_vergleich" label="Vergleich zum aktuellen Gehalt" />
          <SendeKnopf text="Gehalt speichern" />
        </form>

        <form action={speichern("rahmen")} className="karte formular kein-druck">
          <h2>Rahmen</h2>
          <Text a={row} name="starttermin" label="Starttermin" type="date" />
          <Text a={row} name="kuendigungsfrist" label="Kündigungsfrist" />
          <Text a={row} name="referenzen" label="Referenzen" gross />
          <SendeKnopf text="Rahmen speichern" />
        </form>

        <form action={speichern("ergebnis")} className="karte formular kein-druck">
          <h2>Ergebnis</h2>
          <label>Ergebnis
            <select name="ergebnis" defaultValue={v(row.ergebnis)}>
              <option value="">– offen –</option>
              {Object.entries(ERGEBNIS_LABEL).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
          </label>
          <Text a={row} name="absagegrund" label="Absagegrund" />
          <Text a={row} name="feedback" label="Feedback" gross />
          <Text a={row} name="rueckzug_grund" label="Grund für das Zurückziehen" />
          <SendeKnopf text="Ergebnis speichern" />
        </form>

        <form action={speichern("einschaetzung")} className="karte formular kein-druck">
          <h2>Einschätzung</h2>
          <label>Interesse
            <select name="interesse" defaultValue={v(row.interesse)}>
              <option value="">– keine Angabe –</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>Tags (mit Komma getrennt)
            <input name="tags" defaultValue={Array.isArray(row.tags) ? row.tags.join(", ") : ""} />
          </label>
          <Text a={row} name="notizen" label="Notizen" gross />
          <SendeKnopf text="Einschätzung speichern" />
        </form>
      </div>

      <section className="karte block kein-druck">
        <h2>Personen</h2>
        <ul className="eintraege">
          {personen.map((p) => (
            <li key={p.id}>
              <div>
                <strong>{p.name}</strong> {p.art && <span className="chip">{KONTAKT_ART_LABEL[p.art]}</span>}
                <p className="klein">{[p.rolle, p.firma, p.email, p.telefon, p.linkedin].filter(Boolean).join(" · ")}</p>
              </div>
              <LoeschForm action={eintragLoeschen.bind(null, id, "contacts", p.id)} frage="Person löschen?" />
            </li>
          ))}
          {personen.length === 0 && <li className="gedaempft">Noch keine Personen.</li>}
        </ul>
        <form action={personAnlegen.bind(null, id)} className="formular">
          <h3>Person hinzufügen</h3>
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
      </section>

      <section className="karte block kein-druck">
        <h2>Interviews und Aufgaben</h2>
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
        <form action={interviewAnlegen.bind(null, id)} className="formular">
          <h3>Interview hinzufügen</h3>
          <label>Datum und Uhrzeit<input name="datum" type="datetime-local" /></label>
          <label>Format<input name="format" placeholder="z. B. Video, vor Ort" /></label>
          <label>Teilnehmer<input name="teilnehmer" /></label>
          <label>Gestellte Fragen<textarea name="fragen_gestellt" rows={3} /></label>
          <label>Eigene Fragen<textarea name="eigene_fragen" rows={3} /></label>
          <label>Eindruck<textarea name="eindruck" rows={3} /></label>
          <label>Case- oder Testaufgabe<input name="aufgabe" /></label>
          <label>Frist der Aufgabe<input name="aufgabe_frist" type="date" /></label>
          <SendeKnopf text="Interview speichern" />
        </form>
      </section>

      <section className="karte block kein-druck">
        <h2>Verlauf</h2>
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
      </section>

      <section className="karte block">
        <div className="kopfzeile">
          <h2>Snapshot der Anzeige</h2>
          <DruckKnopf />
        </div>
        {row.snapshot_text
          ? <pre className="snapshot">{v(row.snapshot_text)}</pre>
          : <p className="gedaempft">Kein Snapshot gespeichert.</p>}
      </section>

      <section className="block kein-druck">
        <LoeschForm action={bewerbungLoeschen.bind(null, id)} frage="Diese Bewerbung mit allem Zubehör endgültig löschen?" text="Bewerbung löschen" />
      </section>
    </>
  );
}
