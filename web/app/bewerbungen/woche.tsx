import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { datumDe } from "@/lib/bewerbung";
import { heuteLokal } from "@/lib/filter";
import { ladeWoche } from "@/lib/tracker-daten";
import { wochenListe } from "@/lib/woche";
import ErledigtForm from "./erledigt-form";

export default async function Woche() {
  const { zeilen, fehler } = await ladeWoche(await createClient());
  const liste = wochenListe(zeilen, heuteLokal());
  return (
    <details open className="karte block woche">
      <summary><h2>Diese Woche</h2></summary>
      {fehler ? <p className="meldung fehler" role="alert">{fehler}</p>
        : liste.length === 0 ? <p className="leer">Nichts Fälliges in den nächsten 7 Tagen.</p>
        : (
          <ul className="wochenliste">
            {liste.map((e) => (
              <li key={`${e.id}-${e.art}-${e.datum}-${e.text}`} className={e.ueberfaellig ? "ueberfaellig" : undefined}>
                <span className="num">{datumDe(e.datum)}</span>
                <span className="num">{e.zeit ?? ""}</span>
                <Link href={`/bewerbung/${e.id}`}>{e.firma || "(ohne Firma)"}</Link>
                <span>{e.text}{e.ueberfaellig && " (überfällig)"}</span>
                {e.art === "schritt" && (
                  <ErledigtForm id={e.id} label={`Erledigt: ${e.text} bei ${e.firma}`} />
                )}
              </li>
            ))}
          </ul>
        )}
    </details>
  );
}
