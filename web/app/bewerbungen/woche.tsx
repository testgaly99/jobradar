import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { datumDe } from "@/lib/bewerbung";
import { heuteLokal } from "@/lib/filter";
import { ladeWoche } from "@/lib/tracker-daten";
import { wochenListe } from "@/lib/woche";
import { schrittErledigt } from "./zug-actions";

// Fehler von schrittErledigt bleiben still; die Zeile bleibt dann sichtbar (shortcut: keine Fehlermeldung, bei Bedarf useActionState).
async function erledigt(f: FormData) {
  "use server";
  await schrittErledigt(String(f.get("id")));
}

export default async function Woche() {
  const { zeilen, fehler } = await ladeWoche(await createClient());
  const liste = wochenListe(zeilen, heuteLokal());
  return (
    <details open className="karte block woche">
      <summary><h2>Diese Woche</h2></summary>
      {fehler ? <p className="meldung fehler">{fehler}</p>
        : liste.length === 0 ? <p className="leer">Nichts Fälliges in den nächsten 7 Tagen.</p>
        : (
          <ul className="wochenliste">
            {liste.map((e, i) => (
              <li key={i} className={e.ueberfaellig ? "ueberfaellig" : undefined}>
                <span className="num">{datumDe(e.datum)}</span>
                <span className="num">{e.zeit ?? ""}</span>
                <Link href={`/bewerbungen/${e.id}`}>{e.firma || "(ohne Firma)"}</Link>
                <span>{e.text}{e.ueberfaellig && " (überfällig)"}</span>
                {e.art === "schritt" && (
                  <form action={erledigt}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="knopf knopf-rand knopf-schmal" type="submit" aria-label={`Erledigt: ${e.text} bei ${e.firma}`}>✓ Erledigt</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
    </details>
  );
}
