import { createClient } from "@/lib/supabase/server";
import { datumDe } from "@/lib/bewerbung";
import { dokumentHerunterladen } from "./actions";
import { DokumentLoeschen, UploadFormular } from "./upload";
import { BriefkopfFormular } from "./briefkopf";
import { Vorlagen } from "./vorlagen";

type Dok = { id: string; art: string | null; name: string | null; version_datum: string | null };
const FEHLT = ["42P01", "PGRST205"]; // Tabelle fehlt: Migration 023 noch nicht eingespielt

function Liste({ docs, leer }: { docs: Dok[]; leer: string }) {
  if (!docs.length) return <p className="gedaempft">{leer}</p>;
  return (
    <ul className="eintraege">
      {docs.map((d) => (
        <li key={d.id}>
          <div>
            <strong>{d.name || "Dokument"}</strong>
            {d.version_datum && <p className="gedaempft klein">{datumDe(d.version_datum)}</p>}
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
  const [{ data: docs }, kopf, vorlagen] = await Promise.all([
    sb.from("documents").select("id,art,name,version_datum").order("version_datum", { ascending: false }),
    sb.from("briefkopf").select("name,strasse,plz_ort,telefon,email,linkedin").maybeSingle(),
    sb.from("anschreiben_vorlagen").select("id,name,betreff,text").order("name"),
  ]);
  const ohneMigration = FEHLT.includes(kopf.error?.code ?? "") || FEHLT.includes(vorlagen.error?.code ?? "");
  const alle = (docs ?? []) as Dok[];
  const weitere = alle.filter((d) => d.art !== "cv" && d.art !== "anlage");
  return (
    <div className="karte">
      <h1>Unterlagen</h1>
      {fehler && <p className="meldung fehler" role="alert">Der Download hat nicht geklappt.</p>}
      <h2>Briefkopf</h2>
      {ohneMigration ? <p className="gedaempft">Verfügbar nach Migration 023.</p> : <BriefkopfFormular kopf={kopf.data} />}
      <h2>Anschreiben-Vorlagen</h2>
      {ohneMigration ? <p className="gedaempft">Verfügbar nach Migration 023.</p> : <Vorlagen vorlagen={vorlagen.data ?? []} />}
      <h2>CV-Versionen</h2>
      <Liste docs={alle.filter((d) => d.art === "cv")} leer="Noch keine CV-Versionen." />
      <h2>Anlagen</h2>
      <Liste docs={alle.filter((d) => d.art === "anlage")} leer="Noch keine Anlagen." />
      {weitere.length > 0 && <><h2>Gespeicherte Anschreiben</h2><Liste docs={weitere} leer="" /></>}
      <h2>Hochladen</h2>
      <UploadFormular />
    </div>
  );
}
