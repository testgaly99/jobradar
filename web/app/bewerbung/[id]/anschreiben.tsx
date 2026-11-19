"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { claudeAuftrag, dateiname, fuelleVorlage, platzhalterWerte } from "@/lib/anschreiben";
import type { Briefkopf } from "@/lib/brief-datei";
import { anlageUmschalten, anschreibenSpeichern } from "./anschreiben-actions";

type Vorlage = { id: string; name: string; betreff: string; text: string };
type Props = {
  applicationId: string; vorlagen: Vorlage[]; kopf: Briefkopf | null; anzeige: string;
  app: { firma: string | null; titel: string | null; quelle: string | null }; kontakt: { name: string | null; anrede: string | null } | null;
};
const MAX_ENDFASSUNG = 10 * 1024 * 1024;
const tt = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

function herunterladen(daten: Uint8Array, name: string, typ: string) {
  const url = URL.createObjectURL(new Blob([daten as BlobPart], { type: typ }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AnschreibenBlock({ applicationId, vorlagen, kopf, anzeige, app, kontakt }: Props) {
  const router = useRouter();
  const [vorlageId, setVorlageId] = useState(vorlagen[0]?.id ?? "");
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<{ text: string; fehler?: boolean } | null>(null);
  const vorlage = vorlagen.find((v) => v.id === vorlageId) ?? null;
  const heute = useMemo(() => new Date(), []);
  const werte = useMemo(() => platzhalterWerte(app, kontakt, heute), [app, kontakt, heute]);
  const betreff = vorlage ? fuelleVorlage(vorlage.betreff, werte) : null;
  const text = vorlage ? fuelleVorlage(vorlage.text, werte) : null;
  const ohneWert = [...new Set([...(betreff?.ohneWert ?? []), ...(text?.ohneWert ?? [])])];
  const unbekannt = [...new Set([...(betreff?.unbekannt ?? []), ...(text?.unbekannt ?? [])])];
  const bereit = !!kopf && !!vorlage && !laeuft;

  // Lädt die Datei in den eigenen Speicher und verknüpft sie als Anschreiben (ersetzt das vorige).
  async function speichern(daten: Uint8Array | File, endung: string, typ: string): Promise<boolean> {
    const sb = createClient();
    const { data: c } = await sb.auth.getClaims();
    const uid = c?.claims?.sub;
    if (!uid) { setMeldung({ text: "Bitte melde dich an.", fehler: true }); return false; }
    const pfad = `${uid}/${crypto.randomUUID()}.${endung}`;
    const { error } = await sb.storage.from("dokumente").upload(pfad, daten instanceof File ? daten : new Blob([daten as BlobPart], { type: typ }), { contentType: typ });
    if (error) { setMeldung({ text: "Speichern hat nicht geklappt.", fehler: true }); return false; }
    const r = await anschreibenSpeichern(applicationId, pfad, `Anschreiben ${(app.firma ?? "").slice(0, 90)} ${tt(heute)}`.replace(/\s+/g, " "));
    if (r.fehler) { setMeldung({ text: r.fehler, fehler: true }); return false; }
    router.refresh();
    return true;
  }

  async function erzeugen(art: "pdf" | "docx") {
    if (!kopf || !betreff || !text) return;
    setLaeuft(true); setMeldung(null);
    try {
      const { briefAus, briefDocx, briefPdf } = await import("@/lib/brief-datei");
      const brief = briefAus(kopf, { betreff: betreff.text, text: text.text }, werte);
      const pdf = await briefPdf(brief);
      if (art === "pdf") herunterladen(pdf, dateiname(app.firma, heute, "pdf"), "application/pdf");
      else herunterladen(await briefDocx(brief), dateiname(app.firma, heute, "docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      // Gespeichert wird immer das PDF, auch beim Word-Download (Q158).
      if (await speichern(pdf, "pdf", "application/pdf")) setMeldung({ text: "Heruntergeladen und als Anschreiben gespeichert." });
    } catch {
      setMeldung({ text: "Die Datei konnte nicht erzeugt werden.", fehler: true });
    } finally { setLaeuft(false); }
  }

  async function mitClaude() {
    if (!kopf || !betreff || !text) return;
    const kopfText = [kopf.name, kopf.strasse, kopf.plz_ort, kopf.telefon, kopf.email, kopf.linkedin].filter(Boolean).join("\n");
    const a = claudeAuftrag({ briefkopf: kopfText, anschreiben: `${betreff.text}\n\n${text.text}`, anzeige });
    if (a.art === "link") { window.open(a.url, "_blank", "noopener"); return; }
    try {
      await navigator.clipboard.writeText(a.text);
      window.open(a.url, "_blank", "noopener");
      setMeldung({ text: "Auftrag kopiert – in Claude mit Strg+V einfügen" });
    } catch {
      setMeldung({ text: "Der Auftrag konnte nicht kopiert werden.", fehler: true });
    }
  }

  async function endfassung(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    e.target.value = "";
    if (!datei) return;
    const endung = datei.name.toLowerCase().split(".").pop() ?? "";
    if (!["pdf", "docx"].includes(endung) || datei.size > MAX_ENDFASSUNG) return setMeldung({ text: "Bitte PDF oder Word bis 10 MB.", fehler: true });
    setLaeuft(true); setMeldung(null);
    try {
      const typ = endung === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      if (await speichern(datei, endung, typ)) setMeldung({ text: "Endfassung gespeichert." });
    } catch {
      setMeldung({ text: "Speichern hat nicht geklappt.", fehler: true });
    } finally { setLaeuft(false); }
  }

  return (
    <div className="formular">
      <h3>Anschreiben aus Vorlage</h3>
      {!kopf && <p className="meldung hinweis">Für Briefe brauchst du einen Briefkopf. <a href="/unterlagen">Briefkopf in Unterlagen eintragen</a></p>}
      {vorlagen.length === 0 ? <p className="gedaempft klein">Noch keine Vorlagen. <a href="/unterlagen">Vorlage anlegen</a></p> : (
        <label>Vorlage
          <select value={vorlageId} onChange={(e) => setVorlageId(e.target.value)}>
            {vorlagen.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
      )}
      {betreff && text && (
        <div className="snapshot umbruch" aria-label="Vorschau">
          <p><strong>{betreff.text}</strong></p>
          <p>{text.text}</p>
        </div>
      )}
      {ohneWert.length > 0 && <p className="gedaempft klein">Ohne Wert: {ohneWert.map((n) => `{{${n}}}`).join(", ")}</p>}
      {unbekannt.length > 0 && <p className="gedaempft klein">Unbekannt: {unbekannt.map((n) => `{{${n}}}`).join(", ")}</p>}
      <div className="aktionsreihe">
        <button className="knopf knopf-schmal" type="button" disabled={!bereit} onClick={() => erzeugen("pdf")}>PDF herunterladen</button>
        <button className="knopf knopf-rand knopf-schmal" type="button" disabled={!bereit} onClick={() => erzeugen("docx")}>Word herunterladen</button>
        <button className="knopf knopf-rand knopf-schmal" type="button" disabled={!bereit} onClick={mitClaude}>Mit Claude bearbeiten</button>
      </div>
      <p className="gedaempft klein">Öffnet dein eigenes Claude-Konto; dein Text geht an Claude. claude.ai zeigt dabei einen Warnhinweis, weil der Text über einen Link kommt – prüfe ihn kurz und sende ihn dann ab.</p>
      <label>Endfassung hochladen (PDF oder Word, höchstens 10 MB)
        <input type="file" accept=".pdf,.docx" disabled={laeuft} onChange={endfassung} />
      </label>
      {laeuft && <p className="gedaempft klein" role="status">Bitte warten …</p>}
      {meldung && <p className={`meldung${meldung.fehler ? " fehler" : ""}`} role={meldung.fehler ? "alert" : "status"}>{meldung.text}</p>}
    </div>
  );
}

export function AnlagenHaken({ applicationId, anlagen, angehakt }: { applicationId: string; anlagen: { id: string; name: string | null; art: string }[]; angehakt: string[] }) {
  const router = useRouter();
  const [an, setAn] = useState(new Set(angehakt));
  const [fehler, setFehler] = useState("");
  async function umschalten(id: string, wert: boolean) {
    setAn((s) => { const n = new Set(s); if (wert) n.add(id); else n.delete(id); return n; });
    const r = await anlageUmschalten(applicationId, id, wert);
    if (r.fehler) {
      setFehler(r.fehler);
      setAn((s) => { const n = new Set(s); if (wert) n.delete(id); else n.add(id); return n; });
    } else { setFehler(""); router.refresh(); }
  }
  return (
    <fieldset className="formular">
      <legend><h3>Anlagen</h3></legend>
      {anlagen.length === 0 ? <p className="gedaempft klein">Noch keine Anlagen. <a href="/unterlagen">Anlagen hochladen</a></p>
        : anlagen.map((d) => (
          <label key={d.id} className="klein">
            <input type="checkbox" checked={an.has(d.id)} onChange={(e) => umschalten(d.id, e.target.checked)} /> {d.name || "Anlage"}{d.art ? ` (${d.art})` : ""}
          </label>
        ))}
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
    </fieldset>
  );
}
