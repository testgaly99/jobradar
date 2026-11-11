import { createClient } from "@/lib/supabase/server";
import { dokumentHerunterladen } from "./actions";
import { DokumentLoeschen, UploadFormular } from "./upload";

const ART: Record<string, string> = { cv: "Lebenslauf", anschreiben: "Anschreiben", anlage: "Anlage" };

export default async function Seite({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const { fehler } = await searchParams;
  const sb = await createClient();
  const { data: docs } = await sb.from("documents").select("id,art,name,version_datum").order("version_datum", { ascending: false });
  return (
    <div className="karte">
      <h1>Dokumente</h1>
      {fehler && <p className="meldung fehler" role="alert">Der Download hat nicht geklappt.</p>}
      <h2>Hochladen</h2>
      <UploadFormular />
      <h2>Meine Dokumente</h2>
      {!docs?.length ? <p className="gedaempft">Noch keine Dokumente.</p> : (
        <ul className="eintraege">
          {docs.map((d) => (
            <li key={d.id}>
              <div>
                <strong>{d.name || "Dokument"}</strong>
                <p className="gedaempft klein">{ART[d.art ?? ""] ?? d.art}{d.version_datum ? `, ${d.version_datum.split("-").reverse().join(".")}` : ""}</p>
              </div>
              <div>
                <form action={dokumentHerunterladen.bind(null, d.id)}><button className="knopf knopf-rand knopf-schmal" type="submit">Herunterladen</button></form>
                <DokumentLoeschen id={d.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <h2>Meine Daten</h2>
      <p><a className="knopf knopf-rand knopf-schmal" href="/export">Als Excel-Tabelle herunterladen</a></p>
    </div>
  );
}
