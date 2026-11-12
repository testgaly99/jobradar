"use client";
import { useState, type CSSProperties } from "react";
import { firmenFarbe } from "@/lib/farbe";

// Logo der Firma; fehlt es oder lädt es nicht, ein farbiger Kreis mit dem Anfangsbuchstaben.
export default function FirmenLogo({ firma, url, gross = false }: { firma: string; url: string | null | undefined; gross?: boolean }) {
  const [kaputt, setKaputt] = useState(false);
  const name = firma.trim() || "?";
  const klasse = "firmenlogo" + (gross ? " firmenlogo-gross" : "");
  const px = gross ? 40 : 24;
  if (url && !kaputt) {
    return <img className={klasse} src={url} alt="" width={px} height={px} draggable={false} referrerPolicy="no-referrer" onError={() => setKaputt(true)} />;
  }
  return <span className={klasse + " firmenlogo-kreis"} aria-hidden="true" style={{ "--firma-h": firmenFarbe(name) } as CSSProperties}>{name.charAt(0).toUpperCase()}</span>;
}
