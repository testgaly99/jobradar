"use client";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type TouchEvent } from "react";
import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { ERGEBNIS_LABEL, STATUS_LABEL, tagDe, type Status } from "@/lib/bewerbung";
import { firmenFarbe } from "@/lib/farbe";
import { rundePatch } from "@/lib/zug";
import { BOARD_SPALTEN, type Karte } from "@/lib/tracker-karte";

export type KartenAktionen = {
  status: (k: Karte, ziel: Status) => void;
  runde: (k: Karte, richtung: 1 | -1) => void;
  kommentar: (k: Karte, text: string) => void;
};

// Klicks in Eingabefeldern sollen tippen/auswählen, nicht ziehen.
const inFeld = (t: EventTarget) => t instanceof Element && !!t.closest("input, select, textarea");

export function Logo({ karte }: { karte: Karte }) {
  const [kaputt, setKaputt] = useState(false);
  const name = karte.firma || "?";
  if (karte.logo_url && !kaputt) {
    return <img className="logo" src={karte.logo_url} alt="" width={24} height={24} draggable={false} referrerPolicy="no-referrer" onError={() => setKaputt(true)} />;
  }
  return <span className="logo logo-kreis" aria-hidden="true" style={{ "--firma": firmenFarbe(name) } as CSSProperties}>{name.trim().charAt(0).toUpperCase()}</span>;
}

export default function KarteAnsicht({ karte, ohneSpalten, neu, fokus, aktionen }: { karte: Karte; ohneSpalten: boolean; neu: boolean; fokus: number; aktionen: KartenAktionen }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: karte.id, data: { karte } });
  const [bearbeiten, setBearbeiten] = useState(false);
  const griff = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (fokus) griff.current?.focus(); }, [fokus]);
  const firma = karte.firma || "(ohne Firma)";
  const speichern = (text: string) => {
    setBearbeiten(false);
    if (text.trim() !== (karte.kommentar ?? "")) aktionen.kommentar(karte, text);
  };
  return (
    <article
      ref={setNodeRef}
      className="karte kanbankarte"
      data-zieht={isDragging || undefined}
      data-neu={neu || undefined}
      // Maus/Finger: ganze Karte ziehbar; Tastatur nur über den Griff (sonst startet Leertaste im Kommentar das Ziehen).
      onMouseDown={(e: MouseEvent) => { if (!inFeld(e.target)) listeners?.onMouseDown?.(e); }}
      onTouchStart={(e: TouchEvent) => { if (!inFeld(e.target)) listeners?.onTouchStart?.(e); }}
    >
      <div className="karte-kopf">
        {!ohneSpalten && <Logo karte={karte} />}
        <h3><Link href={`/bewerbungen/${karte.id}`} draggable={false}>{firma}</Link></h3>
        <button type="button" ref={(el) => { setActivatorNodeRef(el); griff.current = el; }} className="griff" {...attributes} onKeyDown={(e) => listeners?.onKeyDown?.(e)} aria-label={`${firma} verschieben`}>
          <span aria-hidden="true">⠿</span>
        </button>
      </div>
      {karte.titel && <p>{karte.titel}</p>}
      {karte.status === "abgeschlossen" && <p><span className="chip chip-ergebnis">{ERGEBNIS_LABEL[karte.ergebnis ?? ""] ?? "ohne Ergebnis"}</span></p>}
      {karte.gehalt && <p className="klein">{karte.gehalt}</p>}
      {karte.letzterSchritt && <p className="klein gedaempft">{karte.letzterSchritt}</p>}
      {karte.naechsterTermin && <p className="klein">{karte.naechsterTermin.text}: {tagDe(karte.naechsterTermin.datum)}</p>}
      {karte.interesse && (
        <p className="sterne" role="img" aria-label={`Interesse ${karte.interesse} von 5`}>
          <span aria-hidden="true">{"★".repeat(karte.interesse)}{"☆".repeat(5 - karte.interesse)}</span>
        </p>
      )}
      {!ohneSpalten && karte.status === "im_gespraech" && (
        <div className="runde">
          <details className="menue">
            <summary aria-label={`Runde ${karte.runde ?? 1}, Menü`}><span className="chip">R{karte.runde ?? 1}</span></summary>
            <button type="button" className="knopf knopf-leise" disabled={!rundePatch(karte.runde, -1)}
              onClick={(e) => { (e.currentTarget.closest("details") as HTMLDetailsElement).open = false; aktionen.runde(karte, -1); }}>Runde zurück</button>
          </details>
          <button type="button" className="knopf knopf-leise" disabled={!rundePatch(karte.runde, 1)} onClick={() => aktionen.runde(karte, 1)}>+ Runde</button>
        </div>
      )}
      {!ohneSpalten && (bearbeiten
        ? <input className="kommentar-feld" aria-label={`Kommentar zu ${firma}`} maxLength={140} autoFocus defaultValue={karte.kommentar ?? ""}
            onBlur={(e) => speichern(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") { e.currentTarget.value = karte.kommentar ?? ""; e.currentTarget.blur(); }
            }} />
        : <button type="button" className={`kommentar${karte.kommentar ? "" : " gedaempft"}`} onClick={() => setBearbeiten(true)}
            aria-label={karte.kommentar ? `Kommentar ändern: ${karte.kommentar}` : `Kommentar zu ${firma} hinzufügen`}>
            {karte.kommentar || "+ Kommentar"}
          </button>)}
      <label className="klein karte-status">Status
        <select value={karte.status} onChange={(e) => aktionen.status(karte, e.currentTarget.value as Status)}>
          {BOARD_SPALTEN.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          <option value="abgeschlossen">Archiv…</option>
        </select>
      </label>
      {ohneSpalten && <Link className="klein" href={`/bewerbungen/${karte.id}`} draggable={false}>Bewerbung öffnen</Link>}
    </article>
  );
}
