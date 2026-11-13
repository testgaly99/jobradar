type Zeile = { text_hash: string | null; ki_hash: string | null; ki_modell: string | null };

// SHA-256 von "": Stellen ohne Text werden nie ausgewertet und zählen deshalb nicht.
const HASH_LEER = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

// wartend: Text da, aber noch nicht (oder für einen älteren Text) ausgewertet; fehler: Auswertung für den aktuellen Text gescheitert.
export function kiStand(zeilen: Zeile[]): { wartend: number; fehler: number } {
  let wartend = 0, fehler = 0;
  for (const z of zeilen) {
    if (!z.text_hash || z.text_hash === HASH_LEER) continue;
    if (z.ki_hash !== z.text_hash) wartend++;
    else if (z.ki_modell === "fehler") fehler++;
  }
  return { wartend, fehler };
}

// Holt alle Zeilen seitenweise (PostgREST kappt bei 1000, auch mit limit()). Der Holer wirft bei Fehlern.
export async function ladeAlle<T>(hole: (von: number, bis: number) => Promise<T[]>): Promise<T[]> {
  const alle: T[] = [];
  for (let von = 0; ; von += 1000) {
    const seite = await hole(von, von + 999);
    alle.push(...seite);
    if (seite.length < 1000) return alle;
  }
}

// Nur http(s)-Adressen dürfen als Link erscheinen (Anzeigen-URLs sind fremde Daten).
export const sichererLink = (url: string | null): string | null => (url && /^https?:\/\//i.test(url) ? url : null);
