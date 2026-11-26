import type { SupabaseClient } from "@supabase/supabase-js";
import { abgleich, type Abgleich, type Anforderung, type Ergebnis } from "@/lib/cv-ergebnis";

// Lädt nur eigene Daten (RLS). Fehler (z. B. Migration 018 fehlt) ergeben null: dann kein Abgleich-Block.
export async function ladeAbgleich(sb: SupabaseClient, ziel: { job_id: string } | { application_id: string },
  liste: unknown, anforderungsHash: unknown): Promise<Abgleich | null> {
  const [docs, texte, erg] = await Promise.all([
    sb.from("documents").select("id,name,standard").eq("art", "cv"),
    sb.from("cv_texte").select("dokument_id,hash"),
    "job_id" in ziel
      ? sb.from("cv_ergebnisse").select("empfohlen,anforderungen,anforderungs_hash,cv_hashes,weg").eq("job_id", ziel.job_id).limit(1).maybeSingle()
      : sb.from("cv_ergebnisse").select("empfohlen,anforderungen,anforderungs_hash,cv_hashes,weg").eq("application_id", ziel.application_id).limit(1).maybeSingle(),
  ]);
  if (docs.error || texte.error || erg.error) return null;
  const hash = new Map((texte.data ?? []).map((t) => [t.dokument_id as string, t.hash as string]));
  const cvs = (docs.data ?? []).map((d) => ({ id: d.id as string, name: (d.name as string) || "Lebenslauf", standard: !!d.standard, hash: hash.get(d.id) ?? null }));
  const a = abgleich(Array.isArray(liste) ? (liste as Anforderung[]) : null, typeof anforderungsHash === "string" ? anforderungsHash : null,
    erg.data as Ergebnis | null, cvs);
  // Nachtschätzung (ohne KI): Farben nur blasser, mit dem Wort "geschätzt" an der Überschrift
  return a?.zustand === "fertig" ? { ...a, geschaetzt: (erg.data as { weg?: string } | null)?.weg === "schaetzung" } : a;
}

// Kopfzeile; bei zwei gleich guten CVs schaltet ein Radio-Paar per CSS (:has) die Markierungen um, ganz ohne JavaScript.
export function AbgleichKopf({ a }: { a: Abgleich }) {
  if (a.zustand === "kein_abschnitt") return <p className="gedaempft">Lebenslauf-Abgleich: Kein Anforderungsabschnitt erkannt.</p>;
  if (a.zustand === "offen") return <p className="gedaempft">Lebenslauf-Abgleich: Noch nicht abgeglichen.</p>;
  const [x, y] = a.spalten;
  if (!y) return <p className="meldung hinweis">Am besten passt: <strong>{x.cv.name}</strong>. Die Markierungen stehen in der Anzeige.</p>;
  return (
    <fieldset className="meldung hinweis cv-umschalter">
      <legend>Gleich gut: <strong>{x.cv.name}</strong> und <strong>{y.cv.name}</strong>. Markierungen zeigen für:</legend>
      {a.spalten.map((s, i) => (
        <label key={s.cv.id}><input type="radio" name="cv-spalte" id={`cv-spalte-${i}`} defaultChecked={i === 0} /> {s.cv.name}</label>
      ))}
    </fieldset>
  );
}
