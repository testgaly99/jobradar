import { Fragment } from "react";
import Link from "next/link";
import { STATUS_LABEL, datumDe } from "@/lib/bewerbung";
import { nachMerkStufe, type Karte, type MerkStufe } from "@/lib/tracker-karte";
import type { Detail } from "@/lib/tracker-daten";
import FirmenLogo from "../firmenlogo";
import DetailAnsicht from "./detail";
import { MerkKnoepfe } from "./knoepfe";

type SP = Record<string, string | string[] | undefined>;
const GRUPPEN: [MerkStufe, string][] = [["neu", "Neu gemerkt"], ["gemerkt", "Gemerkt"], ["spaeter", "Für später"]];

// Master-Detail: Zeilen sind Links mit ?id=, damit Zurück, Neuladen und Tastatur ohne Zusatzcode funktionieren.
export default function Liste({ karten, gewaehlt, detail, sp }: { karten: Karte[]; gewaehlt: Karte | null; detail: Detail | null; sp: SP }) {
  const basis = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (k !== "id" && v !== undefined) [v].flat().forEach((w) => basis.append(k, w));
  const href = (id: string) => { const p = new URLSearchParams(basis); p.set("id", id); return `/bewerbungen?${p}`; };
  const zeile = (k: Karte) => (
    <Fragment key={k.id}>
      <li>
        <Link href={href(k.id)} scroll={false} aria-current={k.id === gewaehlt?.id ? "true" : undefined} className="meine-zeile">
          <FirmenLogo firma={k.firma ?? ""} url={k.logo_url} />
          <span className="meine-text"><b>{k.firma || "(ohne Firma)"}</b>{k.titel && <span className="gedaempft">{k.titel}</span>}{k.offlineSeit && <span><span className="chip chip-offline">Offline seit {datumDe(k.offlineSeit)}</span></span>}</span>
          <span className="chip" data-status={k.status}>{STATUS_LABEL[k.status]}</span>
        </Link>
        {k.status === "gemerkt" && <MerkKnoepfe id={k.id} stufe={k.merkStufe} />}
      </li>
      {k.id === gewaehlt?.id && <li className="detail-unter"><DetailAnsicht karte={k} detail={detail} /></li>}
    </Fragment>
  );
  // Der Block „Gemerkt“ steht dort, wo die erste gemerkte Bewerbung stünde, in drei Gruppen.
  const gruppen = nachMerkStufe(karten.filter((k) => k.status === "gemerkt"));
  const erste = karten.find((k) => k.status === "gemerkt");
  return (
    <div className="meine">
      <ul className="meine-liste" aria-label="Bewerbungen">
        {karten.map((k) => k.status !== "gemerkt" ? zeile(k) : k.id !== erste?.id ? null : GRUPPEN.map(([stufe, titel]) => gruppen[stufe].length > 0 && (
          <Fragment key={stufe}>
            <li className="meine-gruppe"><h3>{titel}</h3></li>
            {gruppen[stufe].map(zeile)}
          </Fragment>
        )))}
      </ul>
      {gewaehlt && <aside className="detail-spalte karte" aria-label={`Details zu ${gewaehlt.firma || "(ohne Firma)"}`}><DetailAnsicht karte={gewaehlt} detail={detail} /></aside>}
    </div>
  );
}
