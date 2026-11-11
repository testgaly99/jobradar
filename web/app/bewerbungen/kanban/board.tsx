"use client";
import { useEffect, useOptimistic, useState, useTransition, type ReactNode } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, useDroppable, useSensor, useSensors,
  type Active, type Announcements, type DragEndEvent, type UniqueIdentifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ERGEBNIS_LABEL, STATUS_LABEL, type Status } from "@/lib/bewerbung";
import { heuteLokal } from "@/lib/filter";
import { BOARD_SPALTEN, karteAendern, nachSpalten, type Karte } from "@/lib/tracker-karte";
import { zugPatch } from "@/lib/zug";
import { kommentarSpeichern, rundeAendern, zugAusfuehren, zugRueckgaengig, type ZugVorher } from "../zug-actions";
import ArchivDialog from "./archiv-dialog";
import KarteAnsicht, { Logo, type KartenAktionen } from "./karte";

const spaltenName = (id: UniqueIdentifier) => (id === "abgeschlossen" ? "Archiv" : STATUS_LABEL[id as Status] ?? String(id));
const karteVon = (a: Active) => a.data.current?.karte as Karte;
const nameVon = (a: Active) => karteVon(a)?.firma || "Karte";

const ansagen: Announcements = {
  onDragStart: ({ active }) => `${nameVon(active)} aufgenommen.`,
  onDragOver: ({ active, over }) => (over ? `${nameVon(active)} ist über ${spaltenName(over.id)}.` : `${nameVon(active)} ist über keiner Spalte.`),
  onDragEnd: ({ active, over }) => (over ? `${nameVon(active)} abgelegt in ${spaltenName(over.id)}.` : `${nameVon(active)} abgelegt, keine Spalte gewählt.`),
  onDragCancel: ({ active }) => `Ziehen abgebrochen. ${nameVon(active)} bleibt an ihrem Platz.`,
};
const anleitung = "Zum Aufnehmen Leertaste oder Enter drücken. Mit den Pfeiltasten eine andere Spalte wählen, mit Leertaste oder Enter ablegen, mit Escape abbrechen.";

function Spalte({ id, titel, anzahl, leer, children }: { id: Status; titel: string; anzahl: number; leer?: string; children?: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section ref={setNodeRef} className={`spalte${id === "abgeschlossen" ? " spalte-archiv" : ""}`} data-ziel={isOver || undefined} aria-label={titel}>
      <h2>{titel} {anzahl > 0 && <span className="chip num">{anzahl}</span>}</h2>
      {children}
      {leer && <p className="ablage-hinweis klein">{leer}</p>}
    </section>
  );
}

type Meldung = { text: string; rueck?: () => void };

export default function Board({ karten, ohneSpalten, archiv }: { karten: Karte[]; ohneSpalten: boolean; archiv: boolean }) {
  // Sofortige Anzeige; endet die Aktion, kommt der Serverstand (revalidatePath) in derselben Transition, also ohne Flackern.
  const [liste, aendern] = useOptimistic(karten, (stand: Karte[], a: { id: string; patch: Partial<Karte> }) => karteAendern(stand, a.id, a.patch));
  const [, starte] = useTransition();
  const [meldung, setMeldung] = useState<Meldung | null>(null);
  const [fehler, setFehler] = useState("");
  const [archivFrage, setArchivFrage] = useState<Karte | null>(null);
  const [gezogen, setGezogen] = useState<Karte | null>(null);
  const [zuletzt, setZuletzt] = useState<string | null>(null);

  useEffect(() => {
    if (!meldung) return;
    const t = setTimeout(() => setMeldung(null), 8000);
    return () => clearTimeout(t);
  }, [meldung]);

  const sensoren = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Finger: kurz halten, damit Wischen weiter scrollt.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Ein Schritt im Hintergrund: optimistisch ändern, Action rufen, bei Fehler springt die Karte von selbst zurück.
  const schritt = (id: string, patch: Partial<Karte>, action: () => Promise<{ ok: boolean; fehler?: string }>, danach?: (r: never) => void) => {
    setFehler("");
    setMeldung(null);
    setZuletzt(id);
    starte(async () => {
      aendern({ id, patch });
      const r = await action();
      if (!r.ok) setFehler(r.fehler ?? "Das hat leider nicht geklappt.");
      else danach?.(r as never);
    });
  };

  const rueckgaengig = (k: Karte, vorher: ZugVorher, eventIds: string[], aktuell: Status) =>
    schritt(k.id, { status: vorher.status, runde: vorher.runde, ergebnis: vorher.ergebnis, beworben_am: vorher.beworben_am },
      () => zugRueckgaengig(k.id, vorher, eventIds, aktuell),
      (r: { hinweis?: string }) => setMeldung({ text: r.hinweis ?? `${k.firma || "Karte"} ist wieder in ${spaltenName(vorher.status)}.` }));

  const zug = (k: Karte, ziel: { status: Status; ergebnis?: string }) => {
    if (k.status === ziel.status) return;
    const wohin = ziel.ergebnis ? `Archiv (${ERGEBNIS_LABEL[ziel.ergebnis]})` : STATUS_LABEL[ziel.status];
    schritt(k.id, zugPatch(k, ziel, heuteLokal()), () => zugAusfuehren(k.id, k.status, ziel),
      (r: { vorher: ZugVorher; eventIds: string[] }) =>
        setMeldung({ text: `Verschoben nach ${wohin}.`, rueck: () => rueckgaengig(k, r.vorher, r.eventIds, ziel.status) }));
  };

  const aktionen: KartenAktionen = {
    status: (k, s) => (s === "abgeschlossen" ? setArchivFrage(k) : zug(k, { status: s })),
    runde: (k, richtung) => schritt(k.id, { runde: Math.min(4, Math.max(1, (k.runde ?? 1) + richtung)) }, () => rundeAendern(k.id, richtung)),
    kommentar: (k, text) => schritt(k.id, { kommentar: text.trim() || null }, () => kommentarSpeichern(k.id, text)),
  };

  const ablegen = ({ active, over }: DragEndEvent) => {
    setGezogen(null);
    const k = karteVon(active);
    if (!over || !k || over.id === k.status) return;
    aktionen.status(k, over.id as Status);
  };

  const g = nachSpalten(liste);
  return (
    <>
      <DndContext id="kanban" sensors={sensoren} accessibility={{ announcements: ansagen, screenReaderInstructions: { draggable: anleitung } }}
        onDragStart={({ active }) => setGezogen(karteVon(active))} onDragCancel={() => setGezogen(null)} onDragEnd={ablegen}>
        <div className="kanban" role="region" aria-label="Kanban-Ansicht" tabIndex={0}>
          {BOARD_SPALTEN.map((s) => (
            <Spalte key={s} id={s} titel={STATUS_LABEL[s]} anzahl={g[s].length}>
              {g[s].map((k) => <KarteAnsicht key={k.id} karte={k} ohneSpalten={ohneSpalten} neu={k.id === zuletzt} aktionen={aktionen} />)}
            </Spalte>
          ))}
          {archiv
            ? <Spalte id="abgeschlossen" titel="Archiv" anzahl={g.abgeschlossen.length} leer={g.abgeschlossen.length ? undefined : "Noch nichts archiviert."}>
                {g.abgeschlossen.map((k) => <KarteAnsicht key={k.id} karte={k} ohneSpalten={ohneSpalten} neu={k.id === zuletzt} aktionen={aktionen} />)}
              </Spalte>
            : <Spalte id="abgeschlossen" titel="Archiv" anzahl={0} leer="Karte hierher ziehen, um sie mit Ergebnis abzuschließen." />}
        </div>
        {/* Schwebende Kopie: wird nicht vom scrollenden Board abgeschnitten. Ohne Rückflug-Animation, die Karte steht schon am Ziel. */}
        <DragOverlay dropAnimation={null}>
          {gezogen && (
            <div className="karte kanbankarte karte-schwebt">
              <div className="karte-kopf">{!ohneSpalten && <Logo karte={gezogen} />}<h3>{gezogen.firma || "(ohne Firma)"}</h3></div>
              {gezogen.titel && <p>{gezogen.titel}</p>}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <ArchivDialog firma={archivFrage ? archivFrage.firma || "(ohne Firma)" : null}
        onWahl={(ergebnis) => archivFrage && zug(archivFrage, { status: "abgeschlossen", ergebnis })} onZu={() => setArchivFrage(null)} />
      <div className="board-meldungen">
        <div role="status">
          {meldung && (
            <p className="meldung info toast">
              {meldung.text}
              {meldung.rueck && <button type="button" className="knopf knopf-rand knopf-schmal" onClick={meldung.rueck}>Rückgängig</button>}
            </p>
          )}
        </div>
        <div role="alert">
          {fehler && (
            <p className="meldung fehler toast">
              {fehler}
              <button type="button" className="knopf knopf-rand knopf-schmal" onClick={() => setFehler("")}>Schließen</button>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
