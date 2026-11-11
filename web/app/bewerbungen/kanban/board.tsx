"use client";
import { useEffect, useOptimistic, useState, useTransition, type ReactNode } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, useDroppable, useSensor, useSensors,
  type Active, type Announcements, type DragEndEvent, type KeyboardCoordinateGetter, type UniqueIdentifier,
} from "@dnd-kit/core";
import { ERGEBNIS_LABEL, STATUS_LABEL, type Status } from "@/lib/bewerbung";
import { heuteLokal } from "@/lib/filter";
import { BOARD_SPALTEN, karteAendern, nachSpalten, naechsteSpalte, type Karte } from "@/lib/tracker-karte";
import { rundePatch, zugPatch } from "@/lib/zug";
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
// Tastatur: ←/→ setzt die Karte auf die vorige/nächste Spalte (auch das Archiv am Ende); andere Tasten bewegen nichts.
// Nur waagerecht springen: Mit r.top flog die Karte an den Spaltenanfang, und bei gescrollter Seite scrollte dnd-kit die Seite mit.
const spaltenSprung: KeyboardCoordinateGetter = (event, { currentCoordinates, context: { active, over, droppableRects } }) => {
  const richtung = event.code === "ArrowRight" ? 1 : event.code === "ArrowLeft" ? -1 : 0;
  if (!richtung || !active) return;
  event.preventDefault();
  const ziel = naechsteSpalte([...droppableRects].map(([id, r]) => ({ id, left: r.left })), over?.id ?? karteVon(active).status, richtung);
  const r = ziel == null ? undefined : droppableRects.get(ziel);
  return r && { x: r.left, y: currentCoordinates.y };
};
const anleitung ="Zum Aufnehmen Leertaste oder Enter drücken. Mit den Pfeiltasten eine andere Spalte wählen, mit Leertaste oder Enter ablegen, mit Escape abbrechen.";

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
  // Tastaturfokus folgt der Karte in die neue Spalte (sie wird dort neu aufgebaut); n zählt hoch, damit auch derselbe Wert neu fokussiert.
  const [fokus, setFokus] = useState({ id: "", n: 0 });
  const fokussiere = (id: string | null) => setFokus((f) => ({ id: id ?? "", n: f.n + 1 }));

  useEffect(() => {
    if (!meldung) return;
    const t = setTimeout(() => setMeldung(null), 8000);
    return () => clearTimeout(t);
  }, [meldung]);

  const sensoren = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Finger: kurz halten, damit Wischen weiter scrollt.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: spaltenSprung }),
  );

  // Ein Schritt im Hintergrund: optimistisch ändern, Action rufen, bei Fehler springt die Karte von selbst zurück.
  const schritt = (id: string, patch: Partial<Karte>, action: () => Promise<{ ok: boolean; fehler?: string }>, danach?: (r: never) => void) => {
    setFehler("");
    setMeldung(null);
    starte(async () => {
      aendern({ id, patch });
      let r: { ok: boolean; fehler?: string };
      // Netz weg/Serverfehler: nicht zur Fehlerseite, sondern Rücksprung (Transition endet) und Meldung.
      try { r = await action(); } catch { r = { ok: false, fehler: "Speichern fehlgeschlagen. Bitte erneut versuchen." }; }
      if (!r.ok) setFehler(r.fehler ?? "Das hat leider nicht geklappt.");
      else danach?.(r as never);
    });
  };

  const rueckgaengig = (k: Karte, vorher: ZugVorher, eventIds: string[], aktuell: Status) => {
    setZuletzt(k.id);
    fokussiere(k.id); // der Rückgängig-Knopf verschwindet gleich
    schritt(k.id, { status: vorher.status, runde: vorher.runde, ergebnis: vorher.ergebnis, beworben_am: vorher.beworben_am },
      () => zugRueckgaengig(k.id, vorher, eventIds, aktuell),
      (r: { hinweis?: string }) => setMeldung({ text: r.hinweis ?? `${k.firma || "Karte"} ist wieder in ${spaltenName(vorher.status)}.` }));
  };

  const zug = (k: Karte, ziel: { status: Status; ergebnis?: string }) => {
    if (k.status === ziel.status) return;
    setZuletzt(k.id);
    const wohin = ziel.ergebnis ? `Archiv (${ERGEBNIS_LABEL[ziel.ergebnis]})` : STATUS_LABEL[ziel.status];
    schritt(k.id, zugPatch(k, ziel, heuteLokal()), () => zugAusfuehren(k.id, k.status, ziel),
      (r: { vorher: ZugVorher; eventIds: string[] }) =>
        setMeldung({ text: `Verschoben nach ${wohin}.`, rueck: () => rueckgaengig(k, r.vorher, r.eventIds, ziel.status) }));
  };

  const statusWahl = (k: Karte, s: Status) => (s === "abgeschlossen" ? setArchivFrage(k) : zug(k, { status: s }));
  const aktionen: KartenAktionen = {
    status: (k, s) => { fokussiere(k.id); statusWahl(k, s); },
    // Gleiche Regel wie der Server (null + 1 = 1); ohne gültigen Schritt nichts optimistisch ändern.
    runde: (k, richtung) => schritt(k.id, rundePatch(k.runde, richtung) ?? {}, () => rundeAendern(k.id, richtung)),
    kommentar: (k, text) => schritt(k.id, { kommentar: text.trim() || null }, () => kommentarSpeichern(k.id, text)),
  };

  const ablegen = ({ active, over, activatorEvent }: DragEndEvent) => {
    setGezogen(null);
    const k = karteVon(active);
    if (!over || !k || over.id === k.status) return;
    fokussiere(activatorEvent instanceof KeyboardEvent ? k.id : null);
    statusWahl(k, over.id as Status);
  };

  const g = nachSpalten(liste);
  return (
    <>
      <DndContext id="kanban" sensors={sensoren} accessibility={{ announcements: ansagen, screenReaderInstructions: { draggable: anleitung } }}
        onDragStart={({ active }) => setGezogen(karteVon(active))} onDragCancel={() => setGezogen(null)} onDragEnd={ablegen}>
        <div className="kanban" role="region" aria-label="Kanban-Ansicht" tabIndex={0}>
          {BOARD_SPALTEN.map((s) => (
            <Spalte key={s} id={s} titel={STATUS_LABEL[s]} anzahl={g[s].length}>
              {g[s].map((k) => <KarteAnsicht key={k.id} karte={k} ohneSpalten={ohneSpalten} neu={k.id === zuletzt} fokus={k.id === fokus.id ? fokus.n : 0} aktionen={aktionen} />)}
            </Spalte>
          ))}
          {archiv
            ? <Spalte id="abgeschlossen" titel="Archiv" anzahl={g.abgeschlossen.length} leer={g.abgeschlossen.length ? undefined : "Noch nichts archiviert."}>
                {g.abgeschlossen.map((k) => <KarteAnsicht key={k.id} karte={k} ohneSpalten={ohneSpalten} neu={k.id === zuletzt} fokus={k.id === fokus.id ? fokus.n : 0} aktionen={aktionen} />)}
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
        onWahl={(ergebnis) => archivFrage && zug(archivFrage, { status: "abgeschlossen", ergebnis })} onZu={() => { if (archivFrage) fokussiere(archivFrage.id); setArchivFrage(null); }} />
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
