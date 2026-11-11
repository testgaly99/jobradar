import BewerbungInhalt from "../../[id]/inhalt";
import Fenster from "../../fenster";

// Abgefangen: Klick aus Tabelle oder Board öffnet die Bewerbung im Seitenfenster; Direktaufruf zeigt [id]/page.tsx.
export default async function FensterSeite({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fehler?: string }> }) {
  const [{ id }, { fehler }] = await Promise.all([params, searchParams]);
  return <Fenster><BewerbungInhalt id={id} fehler={fehler} /></Fenster>;
}
