// "Diese Woche": Schritte, Interviews und Aufgaben der nächsten 7 Tage (Schritte auch überfällig).
import type { Status } from "./bewerbung.ts";
import { tagePlus, lokal } from "./filter.ts";
import { tagVon } from "./karte.ts";

export type WochenEintrag = { id: string; firma: string; datum: string; zeit: string | null; text: string; art: "schritt" | "interview" | "aufgabe"; ueberfaellig: boolean };
type B = { id: string; firma: string | null; status: Status; naechster_schritt: string | null; naechster_schritt_faellig: string | null; interviews: { datum: string | null; aufgabe: string | null; aufgabe_frist: string | null }[] };

export function wochenListe(bewerbungen: B[], heute: string): WochenEintrag[] {
  const bis = tagePlus(heute, 7);
  const out: WochenEintrag[] = [];
  for (const b of bewerbungen) {
    if (b.status === "abgeschlossen") continue;
    const firma = b.firma ?? "";
    const imFenster = (d: string) => d >= heute && d <= bis;
    if (b.naechster_schritt_faellig) {
      const d = tagVon(b.naechster_schritt_faellig);
      if (d < heute || imFenster(d)) out.push({ id: b.id, firma, datum: d, zeit: null, text: b.naechster_schritt?.trim() || "Nächster Schritt", art: "schritt", ueberfaellig: d < heute });
    }
    for (const i of b.interviews) {
      if (i.datum) {
        const dt = new Date(i.datum), d = lokal(dt);
        if (imFenster(d)) out.push({ id: b.id, firma, datum: d, zeit: `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`, text: "Interview", art: "interview", ueberfaellig: false });
      }
      if (i.aufgabe_frist) {
        const d = tagVon(i.aufgabe_frist);
        if (imFenster(d)) out.push({ id: b.id, firma, datum: d, zeit: null, text: i.aufgabe?.trim() || "Aufgabe", art: "aufgabe", ueberfaellig: false });
      }
    }
  }
  return out.sort((a, b) => a.datum.localeCompare(b.datum) || (a.zeit ?? "").localeCompare(b.zeit ?? ""));
}
