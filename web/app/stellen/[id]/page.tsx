import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { aktuellerNutzer } from "@/lib/nutzer";
import { AUSGEBLENDET_BRANCHE, ID_FORM, heuteLokal, tagePlus } from "@/lib/filter";
import { datumDe } from "@/lib/bewerbung";
import { bewerbungenBei, bewerbungenLink } from "@/lib/bewerbung-anlegen";
import { firmenTrend } from "@/lib/firmentrend";
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
  const nutzer = await aktuellerNutzer();
  // Ohne "text": Besucher dürfen ihn nicht lesen (Migration 007), die Datenbank würde die ganze Abfrage ablehnen.
  const { data: j } = await sb.from("jobs")
    .select("id,unternehmen,titel,url,ort,remote,arbeitsmodell,vertragsart,erfahrungslevel,erstmals_gesehen,companies(groesse_klasse,kategorie)")
    .eq("id", id).maybeSingle();
  if (!j) notFound();
  // Alles Folgende toleriert fehlende Migration 005: Fehler ergibt leere Daten statt Absturz.
  // Anzeigentext, wichtige Punkte, Merk-Status und "Über <Firma>" nur für Angemeldete.
  const firma = j.unternehmen ?? "";
  const leer = { data: null, error: null };
  const [tx, ab, sbr, wp, app, lf, schonBeworben] = await Promise.all([
    nutzer ? sb.from("jobs").select("text").eq("id", id).maybeSingle() : leer,
    nutzer ? sb.from("jobs").select("abschnitte").eq("id", id).maybeSingle() : leer,
    sb.from("jobs").select("steckbrief").eq("id", id).maybeSingle(),
    nutzer ? sb.from("wichtige_punkte").select("begriff") : { data: [], error: null },
    nutzer ? sb.from("applications").select("id,status").eq("job_id", id).limit(1).maybeSingle() : leer,
    nutzer ? sb.from("laeufe").select("datum,bericht").order("datum", { ascending: false }).limit(120) : { data: [] },
    nutzer ? bewerbungenBei(sb, firma) : 0,
  ]);
  const text: string | null = tx.data?.text ?? null;
  const heute = heuteLokal();
  const trend = firmenTrend(lf.data ?? [], firma, heute);
  const maxOffen = Math.max(1, ...trend.punkte.map((p) => p.offen));
  const q = encodeURIComponent(firma);
  const abschnitte = leseAbschnitte(ab.data?.abschnitte);
  const begriffe = wp.error ? [] : (wp.data ?? []).map((p: { begriff: string }) => p.begriff);
  const alleText = abschnitte ? abschnitte.flatMap((a) => [a.titel, ...a.punkte]).join("\n") : (text ?? "");
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
      {nutzer && firma && (
        <section className="karte block" aria-labelledby="firma-titel">
          <h2 id="firma-titel">Über {firma}</h2>
          {schonBeworben > 0 && (
            <p className="meldung hinweis">Du hast dich bei {firma} schon {schonBeworben}× beworben. <Link href={bewerbungenLink(firma)}>Bewerbungen ansehen</Link></p>
          )}
          <p>Bewertungen suchen:{" "}
            <a href={`https://www.kununu.com/de/search?q=${q}`} target="_blank" rel="noopener noreferrer">kununu</a>{" · "}
            <a href={`https://www.glassdoor.de/Search/results.htm?keyword=${q}`} target="_blank" rel="noopener noreferrer">Glassdoor</a>
          </p>
          {trend.punkte.length > 0 && (
            <p>Gerade offen: <strong>{trend.punkte.at(-1)!.offen} passende Stellen</strong> bei {firma}.</p>
          )}
          {trend.punkte.length >= 2 ? (
            <>
              <h3>Offene Stellen pro Woche</h3>
              <ul className="wochenbalken">
                {trend.punkte.map((p) => (
                  <li key={p.datum} aria-label={`Woche bis ${datumDe(p.datum)}: ${p.offen} offene Stellen`}>
                    <span className="num">{datumDe(p.datum).slice(0, 6)}</span>
                    <span className="balkenfeld"><span className="balkenfuell" style={{ width: `${(p.offen / maxOffen) * 100}%` }} /></span>
                    <span className="num">{p.offen}</span>
                  </li>
                ))}
              </ul>
              <p className="gedaempft">{trend.seit && trend.seit > tagePlus(heute, -30) ? `Seit ${datumDe(trend.seit)}` : "In den letzten 30 Tagen"}: {trend.neu} neu ausgeschrieben, {trend.geschlossen} geschlossen. Zeigt, ob die Firma gerade mehr oder weniger sucht. Gezählt werden nur Stellen, die zu den Jobradar-Regeln passen.</p>
            </>
          ) : trend.punkte.length === 1 && (
            <p className="gedaempft">Jobradar sammelt seit {datumDe(trend.punkte[0].datum)}. Ab der zweiten Woche siehst du hier, ob die Firma mehr oder weniger Stellen ausschreibt.</p>
          )}
        </section>
      )}
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
      <div className="knopfreihe">
        {!nutzer ? (
          <Link className="knopf knopf-rand knopf-schmal" href="/login">Anmelden zum Merken</Link>
        ) : app.data?.status === "gemerkt" ? (
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
        {nutzer && (!app.data || app.data.status === "gemerkt") && (
          <form action={beworben.bind(null, j.id)}><SendeKnopf text="Ich habe mich beworben" klasse="knopf knopf-schmal" /></form>
        )}
      </div>
      {begriffe.length > 0 && <p className="meldung hinweis">{n} deiner wichtigen Punkte kommen vor</p>}
      {nutzer ? (
        <details className="karte">
          <summary>Ganze Anzeige lesen</summary>
          <Abschnitte abschnitte={abschnitte} text={text} begriffe={begriffe} ebene={2} />
        </details>
      ) : (
        <p className="gedaempft">Melde dich an, um die ganze Anzeige hier zu lesen.</p>
      )}
    </>
  );
}
