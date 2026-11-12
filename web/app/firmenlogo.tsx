"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { firmenFarbe } from "@/lib/farbe";
import { scharfGenug } from "@/lib/logo-qualitaet";

// Logo der Firma; fehlt es, lädt es nicht oder ist es zu klein (unscharf), ein farbiger Kreis mit dem Anfangsbuchstaben.
// Das Bild bleibt unsichtbar, bis seine Größe geprüft ist, damit kein unscharfes Logo kurz aufblitzt.
export default function FirmenLogo({ firma, url, gross = false }: { firma: string; url: string | null | undefined; gross?: boolean }) {
  const [zustand, setZustand] = useState<"pruefen" | "gut" | "schlecht">("pruefen");
  const bild = useRef<HTMLImageElement | null>(null);
  const name = firma.trim() || "?";
  const klasse = "firmenlogo" + (gross ? " firmenlogo-gross" : "");
  const px = gross ? 40 : 24;
  const pruefe = (i: HTMLImageElement) => setZustand(scharfGenug(i.naturalWidth, px, url ?? "") ? "gut" : "schlecht");
  // Aus dem Cache geladene Bilder sind oft schon fertig, bevor React onLoad anhängt.
  useEffect(() => { const i = bild.current; if (i?.complete) pruefe(i); }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  if (url && zustand !== "schlecht") {
    return <img ref={bild} className={klasse} src={url} alt="" width={px} height={px} draggable={false} referrerPolicy="no-referrer"
      style={zustand === "pruefen" ? { visibility: "hidden" } : undefined}
      onLoad={(e) => pruefe(e.currentTarget)} onError={() => setZustand("schlecht")} />;
  }
  return <span className={klasse + " firmenlogo-kreis"} aria-hidden="true" style={{ "--firma-h": firmenFarbe(name) } as CSSProperties}>{name.charAt(0).toUpperCase()}</span>;
}
