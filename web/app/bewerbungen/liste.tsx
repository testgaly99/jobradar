import { Fragment } from "react";
import Link from "next/link";
import { STATUS_LABEL } from "@/lib/bewerbung";
import type { Karte } from "@/lib/tracker-karte";
import type { Detail } from "@/lib/tracker-daten";
import FirmenLogo from "../firmenlogo";
import DetailAnsicht from "./detail";

type SP = Record<string, string | string[] | undefined>;

// Master-Detail: Zeilen sind Links mit ?id=, damit Zurück, Neuladen und Tastatur ohne Zusatzcode funktionieren.
export default function Liste({ karten, gewaehlt, detail, sp }: { karten: Karte[]; gewaehlt: Karte | null; detail: Detail | null; sp: SP }) {
  const basis = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (k !== "id" && v !== undefined) [v].flat().forEach((w) => basis.append(k, w));
  const href = (id: string) => { const p = new URLSearchParams(basis); p.set("id", id); return `/bewerbungen?${p}`; };
  return (
    <div className="meine">
      <ul className="meine-liste" aria-label="Bewerbungen">
        {karten.map((k) => (
          <Fragment key={k.id}>
            <li>
              <Link href={href(k.id)} scroll={false} aria-current={k.id === gewaehlt?.id ? "true" : undefined} className="meine-zeile">
                <FirmenLogo firma={k.firma ?? ""} url={k.logo_url} />
                <span className="meine-text"><b>{k.firma || "(ohne Firma)"}</b>{k.titel && <span className="gedaempft">{k.titel}</span>}</span>
                <span className="chip" data-status={k.status}>{STATUS_LABEL[k.status]}</span>
              </Link>
            </li>
            {k.id === gewaehlt?.id && <li className="detail-unter"><DetailAnsicht karte={k} detail={detail} /></li>}
          </Fragment>
        ))}
      </ul>
      {gewaehlt && <aside className="detail-spalte karte" aria-label={`Details zu ${gewaehlt.firma || "(ohne Firma)"}`}><DetailAnsicht karte={gewaehlt} detail={detail} /></aside>}
    </div>
  );
}
