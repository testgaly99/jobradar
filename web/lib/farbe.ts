// Stabiler Farbton (0-359) pro Firma: gleicher Name, gleiche Farbe. Helligkeit und Sättigung kommen als Token
// aus stil/utilitaer.css (A3: keine festen Farbwerte im Code, Dunkelmodus anpassbar). Gesetzt als style="--firma-h: …".
export function firmenFarbe(name: string): number {
  let h = 0;
  for (const c of name.trim().toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}
