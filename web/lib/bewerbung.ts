// Reine Helfer für den Bewerbungs-Tracker (keine Next-Importe, damit testbar).
export const STATUS = ["gemerkt", "beworben", "eingang_bestaetigt", "im_gespraech", "angebot", "abgeschlossen"] as const;
export type Status = (typeof STATUS)[number];
export const STATUS_LABEL: Record<Status, string> = {
  gemerkt: "Gemerkt", beworben: "Beworben", eingang_bestaetigt: "Eingang bestätigt",
  im_gespraech: "Im Gespräch", angebot: "Angebot", abgeschlossen: "Abgeschlossen",
};
export const ERGEBNIS_LABEL: Record<string, string> = {
  zusage: "Zusage", absage: "Absage", zurueckgezogen: "Abgebrochen", angebot_abgelehnt: "Angebot abgelehnt",
};
export const KONTAKT_ART_LABEL: Record<string, string> = {
  ansprechpartner: "Ansprechpartner", eigener_kontakt: "Eigener Kontakt", empfehlungsgeber: "Empfehlungsgeber",
};
export const istStatus = (s: unknown): s is Status => typeof s === "string" && (STATUS as readonly string[]).includes(s);
export const istUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

type Typ = "text" | "url" | "datum" | "zeit" | "int15" | "tags" | "status" | "ergebnis" | "art" | "uuid";
export type Abschnitt = "neu" | "stelle" | "bewerbung" | "gehalt" | "rahmen" | "ergebnis" | "einschaetzung" | "ablauf" | "person" | "interview";
const STELLE: Record<string, Typ> = { firma: "text", titel: "text", link: "url", quelle: "text", standort: "text", praesenzmodell: "text", anforderungen: "text" };

// Allowlist je Abschnitt: nur diese Spalten dürfen geschrieben werden.
export const FELDER: Record<Abschnitt, Record<string, Typ>> = {
  neu: { ...STELLE, status: "status", snapshot_text: "text" },
  stelle: STELLE,
  bewerbung: { beworben_am: "datum", bewerbungsweg: "text", referenznummer: "text", portal_hinweis: "text", cv_dokument_id: "uuid", anschreiben_dokument_id: "uuid" },
  gehalt: { gehalt_spanne_anzeige: "text", gehalt_wunsch: "text", angebot_fix: "text", angebot_variabel: "text", angebot_urlaub: "text", angebot_benefits: "text", gehalt_aktuell_vergleich: "text" },
  rahmen: { starttermin: "datum", kuendigungsfrist: "text", referenzen: "text" },
  ergebnis: { ergebnis: "ergebnis", absagegrund: "text", feedback: "text", rueckzug_grund: "text" },
  einschaetzung: { interesse: "int15", tags: "tags", notizen: "text" },
  ablauf: { status: "status", naechster_schritt: "text", naechster_schritt_faellig: "datum" },
  person: { firma: "text", name: "text", rolle: "text", email: "text", telefon: "text", linkedin: "text", art: "art" },
  interview: { datum: "zeit", format: "text", teilnehmer: "text", fragen_gestellt: "text", eigene_fragen: "text", eindruck: "text", aufgabe: "text", aufgabe_frist: "datum" },
};
const PFLICHT: Partial<Record<Abschnitt, string[]>> = { neu: ["firma", "titel"], stelle: ["firma", "titel"], ablauf: ["status"], person: ["name"] };
const NAME: Record<string, string> = { firma: "Firma", titel: "Titel", status: "Status", name: "Name" };

const datumOk = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
};

export type Eingabe = { get(k: string): unknown };
type Wert = string | number | string[] | null;
export function parseAbschnitt(abschnitt: Abschnitt, f: Eingabe): { daten: Record<string, Wert> } | { fehler: string } {
  const daten: Record<string, Wert> = {};
  for (const [k, typ] of Object.entries(FELDER[abschnitt])) {
    const roh = f.get(k);
    const s = typeof roh === "string" ? roh.trim() : "";
    if (!s) {
      if (PFLICHT[abschnitt]?.includes(k)) return { fehler: `${NAME[k] ?? k} fehlt.` };
      daten[k] = null;
      continue;
    }
    switch (typ) {
      case "text": daten[k] = s; break;
      case "url": {
        let u: URL;
        try { u = new URL(s); } catch { return { fehler: "Der Link muss mit http:// oder https:// beginnen." }; }
        if (u.protocol !== "http:" && u.protocol !== "https:") return { fehler: "Der Link muss mit http:// oder https:// beginnen." };
        daten[k] = u.toString();
        break;
      }
      case "datum": if (!datumOk(s)) return { fehler: "Ungültiges Datum." }; daten[k] = s; break;
      case "zeit": if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) || !datumOk(s.slice(0, 10))) return { fehler: "Ungültiges Datum." }; { const z = berlinZuIso(s); if (!z || +s.slice(11, 13) > 23 || +s.slice(14) > 59) return { fehler: "Ungültiges Datum." }; daten[k] = z; } break;
      case "int15": if (!/^[1-5]$/.test(s)) return { fehler: "Interesse muss zwischen 1 und 5 liegen." }; daten[k] = Number(s); break;
      case "tags": {
        const t = [...new Set(s.split(",").map((x) => x.trim()).filter(Boolean))];
        daten[k] = t.length ? t : null;
        break;
      }
      case "status": if (!istStatus(s)) return { fehler: "Ungültiger Status." }; daten[k] = s; break;
      case "ergebnis": if (!(s in ERGEBNIS_LABEL)) return { fehler: "Ungültiges Ergebnis." }; daten[k] = s; break;
      case "art": if (!(s in KONTAKT_ART_LABEL)) return { fehler: "Ungültige Art." }; daten[k] = s; break;
      case "uuid": if (!istUuid(s)) return { fehler: "Ungültiges Dokument." }; daten[k] = s; break;
    }
  }
  return { daten };
}

// ---------- Tabelle ----------
export const SORT_SPALTEN = ["firma", "titel", "status", "interesse", "beworben_am", "naechster_schritt_faellig", "geaendert_am"] as const;
export type SortSpalte = (typeof SORT_SPALTEN)[number];
export type TabellenFilter = { status: Status[]; firma: string; interesse: number | null; sort: SortSpalte; dir: "asc" | "desc" };
type SP = Record<string, string | string[] | undefined>;
const eins = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function leseTabelle(sp: SP): TabellenFilter {
  const roh = sp.status === undefined ? [] : Array.isArray(sp.status) ? sp.status : [sp.status];
  const i = Number(eins(sp.interesse));
  const sort = eins(sp.sort);
  return {
    status: [...new Set(roh.filter(istStatus))],
    firma: eins(sp.firma).trim(),
    interesse: Number.isInteger(i) && i >= 1 && i <= 5 ? i : null,
    sort: (SORT_SPALTEN as readonly string[]).includes(sort) ? (sort as SortSpalte) : "geaendert_am",
    dir: eins(sp.dir) === "asc" ? "asc" : "desc",
  };
}
export function tabelleZuUrl(f: TabellenFilter): string {
  const p = new URLSearchParams();
  f.status.forEach((s) => p.append("status", s));
  if (f.firma) p.set("firma", f.firma);
  if (f.interesse) p.set("interesse", String(f.interesse));
  if (f.sort !== "geaendert_am") p.set("sort", f.sort);
  if (f.dir === "asc") p.set("dir", "asc");
  const q = p.toString();
  return q ? `/bewerbungen?${q}` : "/bewerbungen";
}
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

export const datumDe = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join(".") : "");
export const zeitDe = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" });
export const tagDe = (iso: string) => new Date(iso).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });

// Berliner Wanduhrzeit ("2026-11-08T10:00") als ISO-Zeitpunkt, sommerzeitrichtig, ohne Bibliothek.
const berlinTeile = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Berlin", hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
});
function berlinOffsetMs(t: number): number {
  const p = Object.fromEntries(berlinTeile.formatToParts(new Date(t)).map((x) => [x.type, +x.value]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(t / 60000) * 60000;
}
export function berlinZuIso(lokal: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(lokal.trim());
  if (!m) return null;
  const wand = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let t = wand - berlinOffsetMs(wand);
  t = wand - berlinOffsetMs(t); // Offset am Zielzeitpunkt erneut prüfen (Sommerzeitwechsel)
  return new Date(t).toISOString();
}

// Wechsel auf "beworben" setzt das Datum, falls es noch leer ist (ein vorhandenes Datum bleibt).
export const beworbenPatch = (status: string, beworbenAm: string | null | undefined, heute: string): { beworben_am?: string } =>
  status === "beworben" && !beworbenAm ? { beworben_am: heute } : {};
