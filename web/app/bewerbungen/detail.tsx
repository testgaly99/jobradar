import Link from "next/link";
import { ERGEBNIS_LABEL, STATUS_LABEL, datumDe } from "@/lib/bewerbung";
import { BOARD_SPALTEN, type Karte } from "@/lib/tracker-karte";
import type { Detail } from "@/lib/tracker-daten";
import FirmenLogo from "../firmenlogo";

const leer = <span className="gedaempft">–</span>;
const keine = <span className="gedaempft">noch keine</span>;

// Nur zum Ansehen; bearbeitet wird im Seitenfenster (Link „Bearbeiten“).
export default function DetailAnsicht({ karte, detail }: { karte: Karte; detail: Detail | null }) {
  const firma = karte.firma || "(ohne Firma)";
  const rang = BOARD_SPALTEN.indexOf(karte.status as (typeof BOARD_SPALTEN)[number]);
  const ort = [detail?.standort, detail?.praesenzmodell].filter(Boolean).join(" · ");
  const anzeige = detail?.job_id ? `/stellen/${encodeURIComponent(detail.job_id)}` : detail?.link || null;
  const fehlt = <span className="gedaempft">konnte nicht geladen werden</span>;
  return (
    <div className="detail">
      <div className="detail-kopf">
        <FirmenLogo firma={firma} url={karte.logo_url} gross />
        <div><h2>{firma}</h2>{karte.titel && <p className="gedaempft">{karte.titel}</p>}</div>
      </div>
      {karte.status === "abgeschlossen" ? (
        <p className="chip" data-status="abgeschlossen">Archiv{karte.ergebnis ? ` · ${ERGEBNIS_LABEL[karte.ergebnis] ?? karte.ergebnis}` : ""}</p>
      ) : (
        <ol className="stufen" aria-label={`Stand: ${STATUS_LABEL[karte.status]}`}>
          {BOARD_SPALTEN.map((s, i) => (
            <li key={s} className={i <= rang ? "erreicht" : undefined} aria-current={i === rang ? "step" : undefined}>
              {STATUS_LABEL[s]}{s === "beworben" && karte.beworben_am ? ` · ${datumDe(karte.beworben_am)}` : ""}
            </li>
          ))}
        </ol>
      )}
      <dl className="fakten">
        <div className="fakt"><dt>Nächster Schritt</dt><dd>{detail?.naechster_schritt || detail?.naechster_schritt_faellig
          ? <>{detail.naechster_schritt || "Nächster Schritt"}{detail.naechster_schritt_faellig && <> · <b>{datumDe(detail.naechster_schritt_faellig)}</b></>}</> : leer}</dd></div>
        <div className="fakt"><dt>Gehalt</dt><dd>{karte.gehalt || leer}</dd></div>
        <div className="fakt"><dt>Ort</dt><dd>{ort || leer}</dd></div>
        <div className="fakt"><dt>Interesse</dt><dd>{karte.interesse
          ? <span className="sterne" role="img" aria-label={`Interesse ${karte.interesse} von 5`}>{"★".repeat(karte.interesse)}{"☆".repeat(5 - karte.interesse)}</span> : leer}</dd></div>
        <div className="fakt"><dt>Personen</dt><dd>{!detail ? fehlt : detail.personen.length
          ? detail.personen.map((p, i) => <div key={i}>{p.name || "(ohne Name)"}{p.rolle && <span className="gedaempft"> · {p.rolle}</span>}</div>) : keine}</dd></div>
        <div className="fakt"><dt>Interviews</dt><dd>{!detail ? fehlt : detail.interviews.length
          ? detail.interviews.map((x, i) => <div key={i}>{x.datum ? datumDe(x.datum) : "ohne Datum"}{x.format && <span className="gedaempft"> · {x.format}</span>}</div>) : keine}</dd></div>
      </dl>
      {karte.kommentar && <p className="detail-kommentar">„{karte.kommentar}“</p>}
      <p className="aktionsreihe">
        <Link className="knopf knopf-schmal" href={`/bewerbung/${karte.id}`}>Bearbeiten</Link>
        {anzeige && (anzeige.startsWith("/")
          ? <Link className="knopf knopf-rand knopf-schmal" href={anzeige}>Zur Anzeige</Link>
          : <a className="knopf knopf-rand knopf-schmal" href={anzeige} target="_blank" rel="noopener noreferrer">Zur Anzeige</a>)}
      </p>
    </div>
  );
}
