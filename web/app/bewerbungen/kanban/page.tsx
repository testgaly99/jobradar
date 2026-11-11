import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { leseTabelle } from "@/lib/bewerbung";
import { ladeKarten } from "@/lib/tracker-daten";
import UnterNav from "../unternav";
import Woche from "../woche";
import Board from "./board";

type SP = Record<string, string | string[] | undefined>;

export default async function Seite({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const archiv = sp.archiv === "1";
  const sb = await createClient();
  const { karten, ohneSpalten, fehler } = await ladeKarten(sb, { ...leseTabelle(sp), archiv });
  // Schalter behält die übrigen Filter in der Adresse.
  const umschalten = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (k !== "archiv" && v !== undefined) [v].flat().forEach((w) => umschalten.append(k, w));
  if (!archiv) umschalten.set("archiv", "1");
  const q = umschalten.toString();
  return (
    <div className="kanban-bereich">
      <h1>Bewerbungen</h1>
      <UnterNav aktiv="kanban" sp={sp} />
      <Woche />
      <p className="board-schalter">
        <Link href={q ? `/bewerbungen/kanban?${q}` : "/bewerbungen/kanban"} className="knopf knopf-rand knopf-schmal">
          {archiv ? "Archiv ausblenden" : "Archiv anzeigen"}
        </Link>
      </p>
      {fehler
        ? <p className="meldung fehler" role="alert">Bewerbungen konnten nicht geladen werden.</p>
        : <Board karten={karten} ohneSpalten={ohneSpalten} archiv={archiv} />}
    </div>
  );
}
