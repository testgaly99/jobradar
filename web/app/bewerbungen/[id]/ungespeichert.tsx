"use client";
import { useEffect } from "react";

const FRAGE = "Du hast Änderungen, die noch nicht gespeichert sind. Seite trotzdem verlassen?";

// B3: Warnt, wenn ein Formular der Bewerbungsseite geändert, aber nicht gespeichert wurde und man die Seite verlässt
// (Tab schließen, neu laden, Link klicken). Gespeichert = das Formular wurde abgeschickt.
// shortcut: Schließen des Seitenfensters per Esc/Klick daneben warnt nicht; nachrüsten im Fenster, falls es stört.
export default function Ungespeichert({ bereich }: { bereich: string }) {
  useEffect(() => {
    const offen = new Set<HTMLFormElement>();
    const inBereich = (t: EventTarget | null) => {
      const f = t instanceof Element ? t.closest("form") : null;
      return f && f.closest(`#${bereich}`) ? f : null;
    };
    const geaendert = (e: Event) => { const f = inBereich(e.target); if (f) offen.add(f); };
    const gespeichert = (e: Event) => { if (e.target instanceof HTMLFormElement) offen.delete(e.target); };
    const verlassen = (e: BeforeUnloadEvent) => { if (offen.size) e.preventDefault(); };
    // Links abfangen, bevor Next.js navigiert (Capture-Phase am Dokument läuft vor Reacts Klick-Handler)
    const klick = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!a || !offen.size || (a as HTMLAnchorElement).target === "_blank" || e.ctrlKey || e.metaKey) return;
      if (confirm(FRAGE)) offen.clear();
      else { e.preventDefault(); e.stopPropagation(); }
    };
    document.addEventListener("input", geaendert);
    document.addEventListener("submit", gespeichert, true);
    document.addEventListener("click", klick, true);
    window.addEventListener("beforeunload", verlassen);
    return () => {
      document.removeEventListener("input", geaendert);
      document.removeEventListener("submit", gespeichert, true);
      document.removeEventListener("click", klick, true);
      window.removeEventListener("beforeunload", verlassen);
    };
  }, [bereich]);
  return null;
}
