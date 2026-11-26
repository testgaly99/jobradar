import type { ListeBlock } from "@/lib/listen-ansicht";
import FirmenLogo from "../firmenlogo";
import FirmaAufklappen from "./firma-aufklappen";

// Pro Rangliste ein Block (anfangs offen, einzeln einklappbar), darin je Firma eine aufklappbare Kachel.
export default function ListenAnsicht({ bloecke, query }: { bloecke: ListeBlock[]; query: string }) {
  if (bloecke.length === 0) return <p className="leer">Keine Firmen mit passenden Stellen in dieser Auswahl.</p>;
  return (
    <div className="listen-ansicht">
      {bloecke.map((b) => (
        <details key={b.id} className="listen-block" open>
          <summary><h2>{b.name} <span className="gedaempft">({b.kacheln.length})</span></h2></summary>
          <div className="kacheln">
            {b.kacheln.map((k) => (
              <FirmaAufklappen key={k.firma} firma={k.firma} query={query} kopf={
                <span className="kachel-kopf">
                  <FirmenLogo firma={k.firma} url={k.logo ?? undefined} />
                  <span className="kachel-name">{k.firma}</span>
                  <span className="gedaempft klein">{k.rang !== null && `Platz ${k.rang} · `}{k.stellen} {k.stellen === 1 ? "Stelle" : "Stellen"}</span>
                </span>
              } />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
