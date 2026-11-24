import { createClient } from "@/lib/supabase/server";
import { datumDe } from "@/lib/bewerbung";
import { ANLAGE_ARTEN } from "@/lib/dokumente";
import { anlageArtAendern, dokumentHerunterladen, standardSetzen } from "./actions";
import { CvText, DokumentLoeschen, EinwilligungFormular, UploadFormular } from "./upload";
import { aktuellerNutzer } from "@/lib/nutzer";
import einwilligungen from "@/lib/cv-einwilligung.json";
import { BriefkopfFormular } from "./briefkopf";
import { Vorlagen } from "./vorlagen";

type Dok = { id: string; art: string | null; name: string | null; version_datum: string | null; anlage_art?: string | null; standard?: boolean | null };
type CvTexte = Map<string, { text: string; herkunft: string }> | null;

function Liste({ docs, leer, texte = null }: { docs: Dok[]; leer: string; texte?: CvTexte }) {
  if (!docs.length) return <p className="gedaempft">{leer}</p>;
  return (
    <ul className="eintraege">
      {docs.map((d) => (
        <li key={d.id}>
          <div>
            <strong>{d.name || "Dokument"}</strong>
            {d.version_datum && <p className="gedaempft klein">{datumDe(d.version_datum)}</p>}
            {d.art === "cv" && texte && (
              <>
                {d.standard ? <p className="klein"><span className="chip">Standard</span></p> : (
                  <form action={standardSetzen.bind(null, d.id)}><button className="knopf knopf-leise knopf-schmal" type="submit">Als Standard</button></form>
                )}
                <CvText id={d.id} text={texte.get(d.id)?.text ?? null} herkunft={texte.get(d.id)?.herkunft ?? null} />
              </>
            )}
            {d.art === "anlage" && "anlage_art" in d && (
              <form action={anlageArtAendern.bind(null, d.id)} className="aktionsreihe">
                <label className="klein">Art
                  <select name="anlage_art" defaultValue={d.anlage_art ?? ""} required>
                    <option value="" disabled>Bitte wählen</option>
                    {Object.entries(ANLAGE_ARTEN).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                  </select>
                </label>
                <button className="knopf knopf-leise knopf-schmal" type="submit">Ändern</button>
              </form>
            )}
          </div>
          <div>
            <form action={dokumentHerunterladen.bind(null, d.id)}><button className="knopf knopf-rand knopf-schmal" type="submit">Herunterladen</button></form>
            <DokumentLoeschen id={d.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function Seite({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const { fehler } = await searchParams;
  const sb = await createClient();
  const [{ data: docs }, kopf, vorlagen, ct, ew] = await Promise.all([
    sb.from("documents").select("*").order("version_datum", { ascending: false }),
    sb.from("briefkopf").select("name,strasse,plz_ort,telefon,email,linkedin").maybeSingle(),
    sb.from("anschreiben_vorlagen").select("id,name,betreff,text").order("name"),
    sb.from("cv_texte").select("dokument_id,text,herkunft"),
    sb.from("cv_einwilligung").select("fassung,erteilt_am").maybeSingle(),
  ]);
  // Fehlt Migration 018, entfallen CV-Text und Standard. Einwilligung gilt nur mit der aktuellen Fassung des Textes,
  // der für dieses Konto gilt (Q274/Q275); fehlt Migration 024, gilt sie als nicht erteilt und der CV-Upload bleibt gesperrt.
  const einw = einwilligungen[(await aktuellerNutzer())?.admin ? "admin" : "browser"];
  const erteilt = !ew.error && ew.data?.fassung === einw.fassung ? (ew.data.erteilt_am as string) : null;
  const texte: CvTexte = ct.error ? null : new Map((ct.data ?? []).map((t) => [t.dokument_id as string, { text: t.text as string, herkunft: t.herkunft as string }]));
  const alle = (docs ?? []) as Dok[];
  const weitere = alle.filter((d) => d.art !== "cv" && d.art !== "anlage");
  return (
    <div className="karte">
      <h1>Unterlagen</h1>
      {fehler && <p className="meldung fehler" role="alert">Der Download hat nicht geklappt.</p>}
      <h2>Briefkopf</h2>
      <BriefkopfFormular kopf={kopf.data} />
      <h2>Anschreiben-Vorlagen</h2>
      <Vorlagen vorlagen={vorlagen.data ?? []} />
      <h2>CV-Versionen</h2>
      {erteilt ? <p className="klein gedaempft">KI-Abgleich: Einwilligung erteilt am {datumDe(erteilt.slice(0, 10))}. Widerruf jederzeit durch Löschen des CV.</p>
        : alle.some((d) => d.art === "cv") && <EinwilligungFormular text={einw.text} />}
      <Liste docs={alle.filter((d) => d.art === "cv")} leer="Noch keine CV-Versionen." texte={texte} />
      <h2>Anlagen</h2>
      <Liste docs={alle.filter((d) => d.art === "anlage")} leer="Noch keine Anlagen." />
      {weitere.length > 0 && <><h2>Gespeicherte Anschreiben</h2><Liste docs={weitere} leer="" /></>}
      <h2>Hochladen</h2>
      <UploadFormular einwilligung={erteilt ? null : einw.text} />
    </div>
  );
}
