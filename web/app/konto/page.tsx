import { aktuellerNutzer } from "@/lib/nutzer";
import { SendeKnopf } from "../bewerbungen/knoepfe";
import { kontoLoeschen } from "./actions";

export default async function Seite({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const { fehler } = await searchParams;
  const n = await aktuellerNutzer();
  return (
    <div className="karte">
      <h1>Konto</h1>
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
      <h2>Meine Daten exportieren</h2>
      <p>Wir empfehlen dir, deine Bewerbungen vorher zu exportieren. Nach dem Löschen sind sie nicht wiederherstellbar.</p>
      <p><a className="knopf knopf-rand knopf-schmal" href="/export">Bewerbungen als Excel-Tabelle (CSV) herunterladen</a></p>
      {n?.admin ? (
        <p>Das Admin-Konto kann nicht gelöscht werden. Es endet erst, wenn die Website und die Datenbank entfernt werden.</p>
      ) : (
        <>
          <h2>Konto löschen</h2>
          <p>Dabei wird alles gelöscht:</p>
          <ul>
            <li>Bewerbungen</li>
            <li>Kontakte</li>
            <li>Interviews</li>
            <li>Verlauf</li>
            <li>Dokumente samt Dateien</li>
          </ul>
          <form action={kontoLoeschen} className="formular">
            <label>Tippe LÖSCHEN ein
              <input name="bestaetigung" required autoComplete="off" />
            </label>
            <SendeKnopf text="Konto endgültig löschen" klasse="knopf knopf-gefahr" />
          </form>
        </>
      )}
    </div>
  );
}
