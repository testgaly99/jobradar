type Zeile = { text_hash: string | null; ki_hash: string | null; ki_modell: string | null };

// wartend: Text da, aber noch nicht (oder für einen älteren Text) ausgewertet; fehler: Auswertung für den aktuellen Text gescheitert.
export function kiStand(zeilen: Zeile[]): { wartend: number; fehler: number } {
  let wartend = 0, fehler = 0;
  for (const z of zeilen) {
    if (!z.text_hash) continue;
    if (z.ki_hash !== z.text_hash) wartend++;
    else if (z.ki_modell === "fehler") fehler++;
  }
  return { wartend, fehler };
}
