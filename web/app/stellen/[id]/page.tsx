import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { levelText } from "@/lib/filter";
import { firmenFarbe } from "@/lib/farbe";
import { leseAbschnitte, zaehleTreffer } from "@/lib/anzeige";
import { merken, beworben } from "../actions";
import { SendeKnopf } from "../../bewerbungen/knoepfe";
import Abschnitte from "../../abschnitte";

const bekannt = (s: string | null) => (s && s.toLowerCase() !== "unbekannt" ? s : null);
const datumDe = (iso: string) => iso.slice(0, 10).split("-").reverse().join(".");
const sicher = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);
// Job-ids sind "<firma>:<ext>"
const ID_FORM = /^[^:\s]{1,100}:[^\s]{1,200}$/;

export default async function Seite({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fehler?: string }> }) {
  const { id: roh } = await params;
  const { fehler } = await searchParams;
  let id: string;
  try { id = decodeURIComponent(roh); } catch { notFound(); }
  if (!ID_FORM.test(id)) notFound();
  const sb = await createClient();
  const { data: j } = await sb.from("jobs")
    .select("id,unternehmen,titel,url,ort,arbeitsmodell,text,erfahrungslevel,erstmals_gesehen,companies(groesse_klasse)")
    .eq("id", id).maybeSingle();
  if (!j) notFound();
  // Alles Folgende toleriert fehlende Migration 005: Fehler ergibt leere Daten statt Absturz.
  const [ab, wp, app] = await Promise.all([
    sb.from("jobs").select("abschnitte").eq("id", id).maybeSingle(),
    sb.from("wichtige_punkte").select("begriff"),
    sb.from("applications").select("id,status").eq("job_id", id).limit(1).maybeSingle(),
  ]);
  const abschnitte = leseAbschnitte(ab.data?.abschnitte);
  const begriffe = wp.error ? [] : (wp.data ?? []).map((p: { begriff: string }) => p.begriff);
  const alleText = abschnitte ? abschnitte.flatMap((a) => [a.titel, ...a.punkte]).join("\n") : (j.text ?? "");
  const n = zaehleTreffer(alleText, begriffe);
  const co = j.companies as unknown as { groesse_klasse: string | null } | null;
  const gr = bekannt(co?.groesse_klasse ?? null);
  const lv = bekannt(j.erfahrungslevel);
  const link = sicher(j.url);

  return (
    <>
      <p><Link href="/stellen">Alle Stellen</Link></p>
      <h1>{j.titel}</h1>
      <p className="firma" style={{ "--akzent": firmenFarbe(j.unternehmen) } as React.CSSProperties}>{j.unternehmen}</p>
      <p className="chips">
        {gr && <span className="chip">{gr} Mitarbeitende</span>}
        {bekannt(j.ort) && <span className="chip">{j.ort}</span>}
        {bekannt(j.arbeitsmodell) && <span className="chip">{j.arbeitsmodell}</span>}
        {lv && <span className="chip">{levelText(lv)}</span>}
        {j.erstmals_gesehen && <span className="chip">Online seit: {datumDe(j.erstmals_gesehen)}</span>}
      </p>
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
      <div className="knopfreihe">
        {app.data ? (
          <Link className="knopf knopf-rand knopf-schmal" href={`/bewerbungen/${app.data.id}`}>
            {app.data.status === "gemerkt" ? "Gemerkt ✓ (zur Bewerbung)" : "Zur Bewerbung"}
          </Link>
        ) : (
          <form action={merken.bind(null, j.id)}><SendeKnopf text="Merken" klasse="knopf knopf-rand knopf-schmal" /></form>
        )}
        {link && <a className="knopf knopf-rand knopf-schmal" href={link} target="_blank" rel="noopener noreferrer">Original-Anzeige öffnen</a>}
        {(!app.data || app.data.status === "gemerkt") && (
          <form action={beworben.bind(null, j.id)}><SendeKnopf text="Ich habe mich beworben" klasse="knopf knopf-schmal" /></form>
        )}
      </div>
      {begriffe.length > 0 && <p className="meldung hinweis">{n} deiner wichtigen Punkte kommen vor</p>}
      <section className="karte">
        <Abschnitte abschnitte={abschnitte} text={j.text} begriffe={begriffe} ebene={2} />
      </section>
    </>
  );
}
