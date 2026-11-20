// Deutschniveau einer Stelle (erkannt im Nachtlauf, scraper/sprachniveau.py) und die Wahl des Nutzers.
export const STUFEN = ["A1", "A2", "B1", "B2", "C1", "C2", "Muttersprache"] as const;
export type Stufe = (typeof STUFEN)[number];
export type Deutsch = { status: "pflicht" | "vorteil" | "ohne_niveau" | "keins"; stufe: string | null; geschaetzt: boolean };

const STATUS = ["pflicht", "vorteil", "ohne_niveau", "keins"] as const;
// "Vorteil" darf einen Bereich tragen ("B2–C1"), Pflicht nur eine Stufe.
const BEREICH = new RegExp(`^(${STUFEN.join("|")})(–(${STUFEN.join("|")}))?$`);

export const stufenRang = (stufe: string): number | null => {
  const i = (STUFEN as readonly string[]).indexOf(stufe);
  return i < 0 ? null : i + 1;
};

export function leseDeutsch(roh: unknown): Deutsch | null {
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) return null;
  const x = roh as Record<string, unknown>;
  if (!STATUS.includes(x.status as Deutsch["status"])) return null;
  const status = x.status as Deutsch["status"];
  const stufe = typeof x.stufe === "string" ? x.stufe : null;
  if (status === "pflicht" && (!stufe || stufenRang(stufe) === null)) return null;
  if (status === "vorteil" && stufe !== null && !BEREICH.test(stufe)) return null;
  return { status, stufe: status === "pflicht" || status === "vorteil" ? stufe : null, geschaetzt: x.geschaetzt === true };
}

export function deutschText(d: Deutsch): string | null {
  if (d.status === "pflicht") return `Deutsch ${d.geschaetzt ? "≈ " : ""}${d.stufe}`;
  if (d.status === "vorteil") return d.stufe ? `Deutsch von Vorteil (${d.stufe})` : "Deutsch von Vorteil";
  if (d.status === "ohne_niveau") return "Deutsch: Niveau nicht angegeben";
  return null;
}

// Wahl aus der Adresse gilt vor der gespeicherten; "alle" schaltet für diesen Aufruf aus. Gäste filtern nie nach Deutsch.
export function deutschWirksam(ausAdresse: string, gespeichert: string | null | undefined, angemeldet: boolean): string {
  if (!angemeldet || ausAdresse === "alle") return "";
  const w = ausAdresse || gespeichert || "";
  return stufenRang(w) === null ? "" : w;
}
