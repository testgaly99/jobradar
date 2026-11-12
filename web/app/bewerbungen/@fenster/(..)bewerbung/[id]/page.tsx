import BewerbungInhalt from "@/app/bewerbung/[id]/inhalt";
import Fenster from "@/app/bewerbungen/fenster";

// Abgefangen: Klick aus Tabelle oder Board öffnet /bewerbung/<id> im Seitenfenster; Direktaufruf zeigt app/bewerbung/[id]/page.tsx.
// Eigene Adresse (Einzahl), damit /bewerbungen/kanban, /neu, /auswertung nie als Kennung abgefangen werden.
export default async function FensterSeite({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fehler?: string }> }) {
  const [{ id }, { fehler }] = await Promise.all([params, searchParams]);
  return <Fenster><BewerbungInhalt id={id} fehler={fehler} /></Fenster>;
}
