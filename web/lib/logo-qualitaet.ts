// Unscharf wirkt ein Logo, wenn es weniger Bildpunkte hat, als scharfe Bildschirme (2 Punkte je CSS-Pixel) brauchen.
// SVG ist Vektorgrafik und immer scharf; der Browser meldet dafür oft keine oder eine zufällige Breite.
export const scharfGenug = (naturalWidth: number, anzeigePx: number, url = ""): boolean =>
  /\.svg(?:[?#]|$)/i.test(url) || naturalWidth >= anzeigePx * 2;
