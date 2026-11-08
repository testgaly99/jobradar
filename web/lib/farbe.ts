// Stabile Akzentfarbe pro Firma: gleicher Name, gleiche Farbe. Mittlere Helligkeit, damit der Streifen in Hell und Dunkel sichtbar bleibt.
export function firmenFarbe(name: string): string {
  let h = 0;
  for (const c of name.trim().toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360}, 65%, 45%)`;
}
