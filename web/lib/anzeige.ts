// Reine Helfer für die gegliederte Stellenanzeige (keine Next-Importe, damit testbar).
export type Anzeigenteil = { titel: string; punkte: string[] };
export type Segment = { text: string; treffer: boolean };

const maskiere = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Zerlegt text in Segmente; treffer=true für ganze Wörter aus begriffe (ohne Groß/Klein, Unicode-sicher, \b taugt für ä/ö/ü nicht).
export function markiere(text: string, begriffe: string[]): Segment[] {
  const liste = [...new Set(begriffe.map((b) => b.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!liste.length || !text) return text ? [{ text, treffer: false }] : [];
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${liste.map(maskiere).join("|")})(?![\\p{L}\\p{N}])`, "giu");
  const out: Segment[] = [];
  let pos = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > pos) out.push({ text: text.slice(pos, m.index), treffer: false });
    out.push({ text: m[0], treffer: true });
    pos = m.index + m[0].length;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), treffer: false });
  return out;
}

// Wie viele der Begriffe kommen im Text vor?
export const zaehleTreffer = (text: string, begriffe: string[]): number =>
  [...new Set(begriffe.map((b) => b.trim()).filter(Boolean))].filter((b) => markiere(text, [b]).some((s) => s.treffer)).length;

// jsonb aus der Datenbank prüfen: nur Form [{titel, punkte[]}], sonst null (dann Rückfall auf den Text).
export function leseAbschnitte(x: unknown): Anzeigenteil[] | null {
  if (!Array.isArray(x)) return null;
  const teile = x.flatMap((a): Anzeigenteil[] => {
    if (!a || typeof a !== "object") return [];
    const { titel, punkte } = a as Record<string, unknown>;
    const p = Array.isArray(punkte) ? punkte.filter((s): s is string => typeof s === "string" && s.trim() !== "") : [];
    return typeof titel === "string" && p.length ? [{ titel, punkte: p }] : [];
  });
  return teile.length ? teile : null;
}
