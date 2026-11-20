"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { analysiereLink, firmaPasst, hostOhneWww, normFirma, normTitel, slugAusFirma } from "@/lib/link-import";
import { aufBeworben, type JobZeile } from "@/lib/bewerbung-anlegen";
import { heuteLokal } from "@/lib/filter";
import { holeStelle, sucheTitel, type Stelle } from "@/lib/ats-abruf";
import { textZuLang } from "@/lib/uebernahme";
import { erkenneFirmaTitel } from "@/lib/groq";
import { istPortal } from "@/lib/stellen-import";
import { darfAbrufen } from "@/lib/seiten-abruf";
import { zielAusFirmenseite, type FirmenseitenZiel } from "@/lib/jobposting";
import { anzeigeLesenAnstossen } from "@/lib/github-anstoss";
import { after } from "next/server";

type Ergebnis = { brauchtEingabe: true } | { fehler: string } | { angelegt: string; vorhanden?: boolean };
type Sb = Awaited<ReturnType<typeof createClient>>;
type Ziel = { firma?: string; titel?: string; ort?: string | null; link: string; quelle: string | null; text?: string | null; job?: JobZeile | null };

// Sofort anlegen, Rest im Hintergrund (Nutzer: nicht warten müssen, Seite verlassen dürfen). Antwort in unter einer Sekunde;
// after() läuft auf dem Server weiter, auch wenn der Browser die Seite schon verlassen hat.
// Neue Bewerbungen starten als beworben (gemerkt nur über "Merken" in der Stellenliste). Eingetragenes geht immer vor:
// der Hintergrund füllt nur leere Felder.
export async function bewerbungAusLink(url: string, firma?: string, titel?: string, text?: string): Promise<Ergebnis> {
  text = text?.replace(/\r\n/g, "\n").trim();
  if (text && textZuLang(text)) return { fehler: "Der Anzeigentext ist zu lang (höchstens 50.000 Zeichen)." };
  const sb = await createClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims) return { fehler: "Bitte melde dich an." };
  const heute = heuteLokal();
  const anlegen = async (zeile: Record<string, unknown>) =>
    (await sb.from("applications").insert({ ...zeile, status: "beworben", beworben_am: heute }).select("id").single()).data?.id as string | undefined;

  if (!url.trim()) {
    const f = firma?.trim() ?? "", t = titel?.trim() ?? "";
    if ((!f || !t) && !text) return { fehler: "Bitte einen Link einfügen, Anzeigentext einfügen oder Firma und Titel eintragen." };
    const id = await anlegen({ firma: f || null, titel: t || null, snapshot_text: text || null });
    if (!id) return { fehler: "Bewerbung konnte nicht angelegt werden." };
    if ((!f || !t) && text) after(async () => {
      const e = await erkenneFirmaTitel(text!);
      if (e) await fuelleLeere(sb, id, { firma: e.firma, titel: e.titel });
    });
    revalidatePath("/bewerbungen");
    return { angelegt: id };
  }
  let u: URL;
  try { u = new URL(url.trim()); } catch { return { fehler: "Das ist kein gültiger Link." }; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { fehler: "Nur http- und https-Links sind möglich." };
  const a = analysiereLink(u.toString());
  const link = a.link ?? u.toString();
  const eigen = { firma: firma?.trim() || undefined, titel: titel?.trim() || undefined };
  const f0 = eigen.firma || a.firma, t0 = eigen.titel || a.titel;
  // Jobportale werden nie abgerufen: ohne Firma und Titel gleich nachfragen (geht ohne Netz, also sofort).
  if (istPortal(u.hostname) && !f0 && !t0) return { brauchtEingabe: true };

  const { data: dup } = await sb.from("applications").select("id").eq("link", link).limit(1).maybeSingle();
  // Schon vorhanden (z. B. gemerkt): auf beworben setzen.
  if (dup?.id) {
    if (!(await aufBeworben(sb, dup.id, heute))) return { fehler: "Der Status konnte nicht gespeichert werden." };
    revalidatePath("/bewerbungen");
    return { angelegt: dup.id, vorhanden: true };
  }
  const id = await anlegen({ firma: f0 ?? null, titel: t0 ?? null, link, quelle: a.quelle, snapshot_text: text || null });
  if (!id) return { fehler: "Bewerbung konnte nicht angelegt werden." };
  after(() => vervollstaendigen(sb, id, { u, a, link, eigen, firma: f0, titel: t0, uid: claims.claims.sub, heute })
    .catch((e) => console.error("vervollstaendigen:", (e as Error).name)));
  revalidatePath("/bewerbungen");
  return { angelegt: id };
}

// Nur leere Felder füllen: was der Nutzer eingetragen hat (auch inzwischen), bleibt unberührt.
async function fuelleLeere(sb: Sb, id: string, felder: Record<string, unknown>) {
  const { data } = await sb.from("applications").select(Object.keys(felder).join(",")).eq("id", id).maybeSingle();
  if (!data) return;
  const alt = data as unknown as Record<string, unknown>;
  const patch = Object.fromEntries(Object.entries(felder).filter(([k, v]) => v != null && v !== "" && (alt[k] == null || alt[k] === "")));
  if (Object.keys(patch).length) await sb.from("applications").update(patch).eq("id", id);
}

type Kontext = { u: URL; a: ReturnType<typeof analysiereLink>; link: string; eigen: { firma?: string; titel?: string };
  firma?: string; titel?: string; uid: string; heute: string };

// Hintergrund: Stellenliste, Bewerbungssysteme und Firmenseite durchsuchen; fehlt danach der Anzeigentext, den Browser-Lauf anstoßen.
async function vervollstaendigen(sb: Sb, id: string, k: Kontext) {
  const { u, a, link } = k;
  let { firma, titel } = k;
  // Verknüpfung nur über die Firma des Boards (companies.ats_typ/ats_id) und die exakte id "<firma>:<ext_id>".
  const ausStelle = async (s: Stelle, typ: string, boardId: string): Promise<Ziel> => {
    const { data: fz } = await sb.from("companies").select("name").eq("ats_typ", typ).eq("ats_id", boardId).limit(1).maybeSingle();
    const job = fz
      ? (await sb.from("jobs").select("id,unternehmen,titel,url,ort,arbeitsmodell,text").eq("id", `${fz.name}:${s.extId}`).limit(1).maybeSingle()).data
      : null;
    if (job) return { firma: job.unternehmen ?? firma, link, quelle: a.quelle, job };
    return { firma, titel: s.titel, ort: s.ort, link, quelle: a.quelle, text: s.text };
  };

  let ziel: Ziel | null = null;
  // Schritt 1: ATS-Link über die offizielle Schnittstelle.
  if (a.ats?.id) {
    try { ziel = await ausStelle(await holeStelle({ ...a.ats, id: a.ats.id }), a.ats.typ, a.ats.id); } catch { /* weiter mit Schritt 2 */ }
  }

  // Schritt 1b: nur Job-Nummer (z. B. ?gh_jid=): in der eigenen Stellenliste nach id "<firma>:<nummer>" suchen; nur bei genau einem Treffer.
  if (!ziel && a.ats?.jobId && /^[A-Za-z0-9._-]{1,200}$/.test(a.ats.jobId)) {
    // "_" ist im like-Muster ein Platzhalter, deshalb escapen.
    const { data: tr } = await sb.from("jobs").select("id,unternehmen,titel,url,ort,arbeitsmodell,text").eq("sichtbar", true).like("id", `%:${a.ats.jobId.replace(/_/g, "\\_")}`).limit(2);
    if (tr?.length === 1) ziel = { link, quelle: a.quelle, job: tr[0] };
  }

  // Schritt 1c: Board-Kennung über die Firmentabelle (gleicher Host wie der Link, gleicher ATS-Typ).
  if (!ziel && a.ats && !a.ats.id) {
    const host = hostOhneWww(link);
    const { data: fs } = host ? await sb.from("companies").select("careers_url,ats_id").eq("ats_typ", a.ats.typ).not("ats_id", "is", null).limit(1000) : { data: null };
    const f = fs?.find((c) => c.careers_url && hostOhneWww(c.careers_url) === host);
    if (f?.ats_id) {
      try { ziel = await ausStelle(await holeStelle({ ...a.ats, id: f.ats_id }), a.ats.typ, f.ats_id); } catch { /* weiter mit Schritt 2 */ }
    }
  }

  // Schritt 1d: beliebige Firmen-Karriereseite einmal abrufen und das eingebettete JobPosting lesen (nie Jobportale).
  let seite: FirmenseitenZiel | null = null;
  if (!ziel && !a.ats && !istPortal(u.hostname) && darfAbrufen(k.uid)) {
    seite = await zielAusFirmenseite(link, k.eigen);
    if (seite.titel) { firma = seite.firma || firma; titel = seite.titel; }
  }

  // Schritt 2: Firma und Titel in jobs suchen.
  if (!ziel && firma && titel) {
    const erstes = normFirma(firma).split(" ")[0].replace(/[\\%_]/g, "");
    const { data: kand } = erstes
      ? await sb.from("jobs").select("id,unternehmen,titel,url,ort,arbeitsmodell,text").eq("sichtbar", true).ilike("unternehmen", `%${erstes}%`).limit(500)
      : { data: null };
    const t = normTitel(titel);
    const job = kand?.find((j) => j.unternehmen && j.titel && firmaPasst(j.unternehmen, firma!) && normTitel(j.titel) === t);
    if (job) ziel = { link, quelle: a.quelle, job };
  }

  // Schritt 3: Boards unter dem Firmennamen als Slug prüfen.
  if (!ziel && firma && titel) {
    const slug = slugAusFirma(firma);
    if (slug) for (const typ of ["greenhouse", "ashby", "lever"] as const) {
      try {
        const s = await sucheTitel(typ, slug, titel);
        if (s) { ziel = await ausStelle(s, typ, slug); break; }
      } catch { /* Board fehlt oder Netzfehler: nächster Anbieter */ }
    }
  }

  // Stelle aus der eigenen Stellenliste: verknüpfen. Gibt es zur Stelle schon eine Bewerbung (z. B. gemerkt), wird diese
  // beworben und die gerade angelegte entfällt (sonst stünde dieselbe Stelle doppelt im Board).
  if (ziel?.job) {
    const job = ziel.job;
    const { data: schon } = await sb.from("applications").select("id").eq("job_id", job.id).neq("id", id).limit(1).maybeSingle();
    if (schon?.id) {
      await aufBeworben(sb, schon.id, k.heute);
      await sb.from("applications").delete().eq("id", id);
      return;
    }
    const abschnitte = (await sb.from("jobs").select("abschnitte").eq("id", job.id).maybeSingle()).data?.abschnitte ?? null;
    await sb.from("applications").update({ job_id: job.id }).eq("id", id);
    await fuelleLeere(sb, id, { firma: job.unternehmen, titel: job.titel, standort: job.ort, praesenzmodell: job.arbeitsmodell,
      snapshot_text: job.text, snapshot_abschnitte: abschnitte });
    return;
  }

  // Schritt 4: aus der Firmenseite oder dem Bewerbungssystem, sonst nur Firma und Titel.
  const ausSeite = !ziel && !!seite?.titel;
  const z: Partial<Ziel> = ziel ?? { firma, titel, ...(ausSeite ? { ort: seite!.ort, text: seite!.text } : {}) };
  await fuelleLeere(sb, id, { firma: z.firma, titel: z.titel, standort: z.ort, snapshot_text: z.text });
  // nachruesten: der Browser-Lauf bei GitHub liest die Anzeige (auch per JavaScript geladene Seiten), füllt leere Felder und
  // ergänzt Gliederung, Steckbrief und Zusammenfassung. Nie für Jobportale; nicht, wenn der Text schon aus einem Bewerbungssystem kam.
  // Ohne Migration 012 fehlt die Spalte: dann nichts markieren und nichts anstoßen.
  const nachSeite = !istPortal(u.hostname) && (ausSeite || !z.text);
  if (nachSeite && !(await sb.from("applications").update({ nachruesten: true }).eq("id", id)).error) await anzeigeLesenAnstossen();
}

// Vorschlag für die Felder im Formular; nur für angemeldete Nutzer. Das Wort "ungültig" erscheint hier nie.
export async function firmaTitelVorschlag(text: string): Promise<{ firma: string; titel: string } | { fehler: string }> {
  const sb = await createClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims) return { fehler: "Bitte melde dich an." };
  const t = text?.trim();
  const e = t && !textZuLang(t) ? await erkenneFirmaTitel(t) : null;
  return e ?? { fehler: "Firma und Titel konnten nicht erkannt werden. Bitte selbst eintragen." };
}
