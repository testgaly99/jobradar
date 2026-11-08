import { ERGEBNIS_LABEL, STATUS_LABEL, datumDe } from "./bewerbung.ts";

// CSV für Excel (Deutschland): UTF-8 mit BOM, Trennzeichen ";", CRLF.

// Feld, das ohne Formel-Schutz geschrieben wird (nur für geprüfte HYPERLINK-Formeln).
export class Roh { text: string; constructor(text: string) { this.text = text; } }

export function csvFeld(wert: unknown): string {
  let s = wert instanceof Roh ? wert.text : wert == null ? "" : Array.isArray(wert) ? wert.join(", ") : typeof wert === "object" ? JSON.stringify(wert) : String(wert);
  // CSV-Injection: Excel würde sonst eine Formel ausführen. Auch für Listen (Tags); Zahlen wie -1 bleiben.
  if (!(wert instanceof Roh) && typeof wert !== "number" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[;"\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function csvDatei(spalten: string[], zeilen: unknown[][]): string {
  const zeile = (f: unknown[]) => f.map(csvFeld).join(";") + "\r\n";
  return "﻿" + zeile(spalten) + zeilen.map(zeile).join("");
}

// Klickbarer Link: nur http(s) und höchstens 255 Zeichen (Excel-Grenze für HYPERLINK), sonst Klartext.
export function linkFeld(wert: string | null): unknown {
  if (!wert) return null;
  const s = wert.trim();
  try {
    const u = new URL(s);
    const h = u.href; // normalisiert: Leerraum und Steuerzeichen am Rand sind schon entfernt
    if ((u.protocol === "http:" || u.protocol === "https:") && h.length <= 255 && !/[\x00-\x1f\x7f]/.test(h))
      return new Roh(`=HYPERLINK("${h.replaceAll('"', '""')}")`);
  } catch { /* kein gültiger Link: als Text */ }
  return wert;
}

type Zeile = Record<string, unknown>;
const berlin = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const datumZeit = (iso: string) => berlin.format(new Date(iso)).replace(", ", " ");
const text = (v: unknown) => (v == null ? "" : String(v));

export function kontaktText(k: Zeile): string {
  const name = [text(k.name), k.rolle ? `(${text(k.rolle)})` : ""].filter(Boolean).join(" ");
  return [name, text(k.email), text(k.telefon)].filter(Boolean).join(", ");
}

export function interviewText(i: Zeile): string {
  const kopf = [i.datum ? datumZeit(text(i.datum)) : "", text(i.format)].filter(Boolean).join(" ");
  return [kopf, text(i.teilnehmer)].filter(Boolean).join(" – ");
}

// snapshot_text fehlt absichtlich (Stellentext, kann Excels Zellgrenze von 32767 Zeichen sprengen).
const SPALTEN_BEWERBUNG = ["Firma", "Titel", "Status", "Link", "Standort", "Quelle", "Präsenzmodell", "Anforderungen", "Beworben am",
  "Bewerbungsweg", "Referenznummer", "Portal-Hinweis", "Lebenslauf", "Anschreiben", "Gehaltsspanne (Anzeige)", "Wunschgehalt",
  "Angebot fix", "Angebot variabel", "Angebot Urlaub", "Angebot Benefits", "Gehalt aktuell (Vergleich)", "Starttermin",
  "Kündigungsfrist", "Referenzen", "Ergebnis", "Absagegrund", "Feedback", "Rückzugsgrund", "Interesse", "Tags", "Notizen",
  "Nächster Schritt", "Nächster Schritt fällig", "Erstellt am", "Geändert am", "Kontakte", "Interviews"];

export function bewerbungenCsv(apps: Zeile[], kontakte: Zeile[], interviews: Zeile[], dokumente: Zeile[]): string {
  const nachBewerbung = (liste: Zeile[]) => {
    const m = new Map<string, Zeile[]>();
    for (const x of liste) m.set(text(x.application_id), [...(m.get(text(x.application_id)) ?? []), x]);
    return m;
  };
  const k = nachBewerbung(kontakte);
  const iv = nachBewerbung(interviews);
  const dok = new Map(dokumente.map((d) => [text(d.id), text(d.name)]));
  const zeilen = apps.map((a) => [
    a.firma, a.titel, STATUS_LABEL[a.status as keyof typeof STATUS_LABEL] ?? a.status, linkFeld(a.link as string | null), a.standort,
    a.quelle, a.praesenzmodell, a.anforderungen, datumDe(a.beworben_am as string | null),
    a.bewerbungsweg, a.referenznummer, a.portal_hinweis, dok.get(text(a.cv_dokument_id)), dok.get(text(a.anschreiben_dokument_id)),
    a.gehalt_spanne_anzeige, a.gehalt_wunsch, a.angebot_fix, a.angebot_variabel, a.angebot_urlaub, a.angebot_benefits,
    a.gehalt_aktuell_vergleich, datumDe(a.starttermin as string | null), a.kuendigungsfrist, a.referenzen,
    a.ergebnis ? (ERGEBNIS_LABEL[a.ergebnis as string] ?? a.ergebnis) : "", a.absagegrund, a.feedback, a.rueckzug_grund,
    a.interesse, a.tags, a.notizen, a.naechster_schritt, datumDe(a.naechster_schritt_faellig as string | null),
    a.erstellt_am ? datumZeit(text(a.erstellt_am)) : "", a.geaendert_am ? datumZeit(text(a.geaendert_am)) : "",
    (k.get(text(a.id)) ?? []).map(kontaktText).filter(Boolean).join(" | "),
    (iv.get(text(a.id)) ?? []).sort((x, y) => text(x.datum).localeCompare(text(y.datum))).map(interviewText).filter(Boolean).join(" | "),
  ]);
  return csvDatei(SPALTEN_BEWERBUNG, zeilen);
}

// Speicherpfad-tauglicher Dateiname: nur [A-Za-z0-9._-], höchstens 100 Zeichen.
export function dateiname(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100) || "datei";
}
