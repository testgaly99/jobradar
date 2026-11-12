import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AUSGEBLENDET_BRANCHE, ID_FORM } from "@/lib/filter";
import { modellText, FELDER, FELD_TITEL, kurzzeile, leseSteckbrief } from "@/lib/steckbrief";
import { firmenFarbe } from "@/lib/farbe";
import { leseAbschnitte, zaehleTreffer } from "@/lib/anzeige";
import { merken, beworben, entmerken } from "../actions";
import { SendeKnopf } from "../../bewerbungen/knoepfe";
import Abschnitte from "../../abschnitte";

const sicher = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

export default async function Seite({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fehler?: string }> }) {
  const { id: roh } = await params;
  const { fehler } = await searchParams;
  let id: string;
  try { id = decodeURIComponent(roh); } catch { notFound(); }
  if (!ID_FORM.test(id)) notFound();
  const sb = await createClient();
  const { data: j } = await sb.from("jobs")
    .select("id,unternehmen,titel,url,ort,remote,arbeitsmodell,vertragsart,text,erfahrungslevel,erstmals_gesehen,companies(groesse_klasse,kategorie)")
    .eq("id", id).maybeSingle();
  if (!j) notFound();
  // Alles Folgende toleriert fehlende Migration 005: Fehler ergibt leere Daten statt Absturz.
  const [ab, sbr, wp, app] = await Promise.all([
    sb.from("jobs").select("abschnitte").eq("id", id).maybeSingle(),
    sb.from("jobs").select("steckbrief").eq("id", id).maybeSingle(),
    sb.from("wichtige_punkte").select("begriff"),
    sb.from("applications").select("id,status").eq("job_id", id).limit(1).maybeSingle(),
  ]);
  const abschnitte = leseAbschnitte(ab.data?.abschnitte);
  const begriffe = wp.error ? [] : (wp.data ?? []).map((p: { begriff: string }) => p.begriff);
  const alleText = abschnitte ? abschnitte.flatMap((a) => [a.titel, ...a.punkte]).join("\n") : (j.text ?? "");
  const n = zaehleTreffer(alleText, begriffe);
  const co = j.companies as unknown as { groesse_klasse: string | null; kategorie: string[] | null } | null;
  const eintraege = kurzzeile({
    groesse: co?.groesse_klasse ?? null, level: j.erfahrungslevel, modell: modellText(j.arbeitsmodell, j.remote), vertrag: j.vertragsart, ort: j.ort,
    erstmalsGesehen: j.erstmals_gesehen, branchen: (co?.kategorie ?? []).filter((k) => k !== AUSGEBLENDET_BRANCHE),
    steckbrief: leseSteckbrief(sbr.error ? null : sbr.data?.steckbrief),
  }, [...FELDER]);
  const link = sicher(j.url);

  return (
    <>
      <p><Link href="/stellen">Alle Stellen</Link></p>
      <h1>{j.titel}</h1>
      <p className="firma" style={{ "--firma-h": firmenFarbe(j.unternehmen) } as React.CSSProperties}>{j.unternehmen}</p>
      {eintraege.length > 0 && (
        <section className="steckbrief karte" aria-labelledby="steckbrief-titel">
          <h2 id="steckbrief-titel">Steckbrief</h2>
          <dl>{eintraege.map((e) => <div key={e.feld}><dt>{FELD_TITEL[e.feld]}</dt><dd>{e.text}</dd></div>)}</dl>
        </section>
      )}
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
      <div className="knopfreihe">
        {app.data?.status === "gemerkt" ? (
          <>
            <form action={entmerken.bind(null, j.id)}>
              <SendeKnopf text="Gemerkt ✓" klasse="knopf knopf-zustand knopf-schmal ist-gemerkt" gedrueckt title="Klicken, um nicht mehr zu merken" />
            </form>
            <Link className="knopf knopf-rand knopf-schmal" href={`/bewerbung/${app.data.id}`}>Zur Bewerbung</Link>
          </>
        ) : app.data ? (
          <Link className="knopf knopf-zustand knopf-schmal" href={`/bewerbung/${app.data.id}`}>Beworben ✓ · Zur Bewerbung</Link>
        ) : (
          <form action={merken.bind(null, j.id)}><SendeKnopf text="Merken" klasse="knopf knopf-rand knopf-schmal" /></form>
        )}
        {link && <a className="knopf knopf-rand knopf-schmal" href={link} target="_blank" rel="noopener noreferrer">Original-Anzeige öffnen</a>}
        {(!app.data || app.data.status === "gemerkt") && (
          <form action={beworben.bind(null, j.id)}><SendeKnopf text="Ich habe mich beworben" klasse="knopf knopf-schmal" /></form>
        )}
      </div>
      {begriffe.length > 0 && <p className="meldung hinweis">{n} deiner wichtigen Punkte kommen vor</p>}
      <details className="karte">
        <summary>Ganze Anzeige lesen</summary>
        <Abschnitte abschnitte={abschnitte} text={j.text} begriffe={begriffe} ebene={2} />
      </details>
    </>
  );
}
