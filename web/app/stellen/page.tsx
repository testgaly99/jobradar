import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { firmenFarbe } from "@/lib/farbe";
import { GRUPPEN, filterZuUrl, heuteLokal, leseFilter, tagePlus, type Gruppe } from "@/lib/filter";
import { PRO_SEITE, stellenAbfrage } from "@/lib/stellen";
import { bewerbungAusStelle } from "./actions";
import FilterBlock from "./filterblock";
import { SendeKnopf } from "../bewerbungen/knoepfe";

const TITEL: Record<Gruppe, string> = {
  groesse: "Größe", kategorie: "Kategorie", level: "Erfahrungslevel", modell: "Arbeitsmodell",
  vertrag: "Vertragsart", bereich: "Bereich", firma: "Unternehmen", stadt: "Stadt",
};
type Facetten = Partial<Record<Gruppe, Record<string, number>>>;
type Job = {
  id: string; unternehmen: string; titel: string; ort: string | null; staedte: string[] | null; remote: boolean | null;
  arbeitsmodell: string | null; vertragsart: string | null; abteilung: string | null; erfahrungslevel: string | null;
  url: string | null; beschreibung_kurz: string | null; erstmals_gesehen: string | null;
  companies: { groesse_klasse: string | null; kategorie: string[] | null };
};

const bekannt = (s: string | null) => (s && s.toLowerCase() !== "unbekannt" ? s : null);
const sicherLink = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);
const datumDe = (iso: string) => iso.split("-").reverse().join(".");

export default async function Seite({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const f = leseFilter(sp);
  const fehler = typeof sp.fehler === "string" ? sp.fehler : null;
  const sb = await createClient();
  const [ergebnis, lauf, fac] = await Promise.all([
    stellenAbfrage(sb, f),
    sb.from("laeufe").select("datum").order("datum", { ascending: false }).limit(1).maybeSingle(),
    sb.rpc("facetten"), // fehlt die Funktion noch (002_facetten.sql), gibt es Filter ohne Zahlen
  ]);
  const jobs = (ergebnis.data ?? []) as unknown as Job[];
  const gesamt = ergebnis.count ?? 0;
  const letzterLauf: string | null = lauf.data?.datum ?? null;
  const veraltet = letzterLauf !== null && letzterLauf < tagePlus(heuteLokal(), -2);
  const neuAb = letzterLauf ? tagePlus(letzterLauf, -2) : null;
  const fa: Facetten = fac.error ? {} : (fac.data ?? {});
  const hatZahlen = !fac.error;
  const seiten = Math.max(1, Math.ceil(gesamt / PRO_SEITE));
  const aktiv = GRUPPEN.reduce((n, g) => n + f[g].length, 0) + (f.q ? 1 : 0) + (f.neu ? 1 : 0);

  return (
    <>
      {veraltet && letzterLauf && (
        <p className="meldung fehler" role="alert">Letzter Lauf am {datumDe(letzterLauf)} – automatischen Abruf prüfen</p>
      )}
      <div className="stellen-layout">
        <aside className="filterleiste">
          <FilterBlock titel={aktiv ? `Filter (${aktiv} aktiv)` : "Filter"}>
            <form method="get" action="/stellen" className="filterform">
              <label>Stichwort (Titel und Text)
                <input type="search" name="q" defaultValue={f.q} />
              </label>
              <label>Neu seit
                <input type="date" name="neu" defaultValue={f.neu} />
              </label>
              <div className="filteraktionen">
                <button className="knopf" type="submit">Filtern</button>
                <Link className="knopf knopf-rand" href="/stellen">Filter zurücksetzen</Link>
              </div>
              {hatZahlen && <p className="gedaempft klein">Anzahl gesamt, nicht nach aktuellem Filter.</p>}
              {GRUPPEN.map((g) => {
                const werte = fa[g] ?? {};
                // Gewählte Werte bleiben sichtbar, auch wenn sie in den Zahlen fehlen
                const namen = [...new Set([...Object.keys(werte), ...f[g]])].sort((a, b) => a.localeCompare(b, "de"));
                if (!namen.length) return null;
                return (
                  <details key={g} className="gruppe" open={g === "groesse" || g === "kategorie" || f[g].length > 0}>
                    <summary>{TITEL[g]}{f[g].length > 0 && ` (${f[g].length})`}</summary>
                    <div className="optionen">
                      {namen.map((n) => (
                        <label key={n} className="option">
                          <input type="checkbox" name={g} value={n} defaultChecked={f[g].includes(n)} />
                          <span>{n}{werte[n] !== undefined && ` (${werte[n]})`}</span>
                        </label>
                      ))}
                    </div>
                  </details>
                );
              })}
            </form>
          </FilterBlock>
        </aside>

        <section aria-label="Stellen">
          <h1>Stellen</h1>
          {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
          <p className="gedaempft">
            {gesamt} Treffer{letzterLauf && ` · Stand ${datumDe(letzterLauf)}`}
          </p>
          {ergebnis.error && ergebnis.error.code !== "PGRST103" && <p className="meldung fehler">Stellen konnten nicht geladen werden.</p>}
          {(!ergebnis.error || ergebnis.error.code === "PGRST103") && jobs.length === 0 && <p className="karte">Keine Stellen für diese Auswahl.</p>}
          <ul className="stellenliste">
            {jobs.map((j) => {
              const link = sicherLink(j.url);
              const ort = j.ort || j.staedte?.join(", ") || null;
              const neu = !!(neuAb && j.erstmals_gesehen && j.erstmals_gesehen >= neuAb);
              const chips = [bekannt(j.erfahrungslevel), bekannt(j.arbeitsmodell), bekannt(j.vertragsart),
                j.remote ? "Remote" : null, bekannt(j.companies?.groesse_klasse ?? null)].filter(Boolean) as string[];
              return (
                <li key={j.id} className="karte stelle" style={{ "--akzent": firmenFarbe(j.unternehmen) } as React.CSSProperties}>
                  <h2>
                    {link ? <a href={link} target="_blank" rel="noopener noreferrer">{j.titel}</a> : j.titel}
                  </h2>
                  <p className="firma" style={{ color: firmenFarbe(j.unternehmen) }}>{j.unternehmen}</p>
                  <p className="gedaempft">{[ort, bekannt(j.abteilung)].filter(Boolean).join(" · ")}</p>
                  <p className="chips">
                    {neu && <span className="chip chip-neu">neu</span>}
                    {chips.map((c) => <span key={c} className="chip">{c}</span>)}
                  </p>
                  {!!j.companies?.kategorie?.length && <p className="gedaempft klein">{j.companies.kategorie.join(", ")}</p>}
                  {j.erstmals_gesehen && <p className="gedaempft klein">Erstmals gesehen: {datumDe(j.erstmals_gesehen)}</p>}
                  {j.beschreibung_kurz && <p>{j.beschreibung_kurz}</p>}
                  <form action={bewerbungAusStelle.bind(null, j.id)}>
                    <SendeKnopf text="Bewerbung anlegen" klasse="knopf knopf-rand knopf-schmal" />
                  </form>
                </li>
              );
            })}
          </ul>
          <nav className="seiten" aria-label="Seiten">
            {f.seite > 1 ? <Link className="knopf knopf-rand" href={filterZuUrl({ ...f, seite: f.seite - 1 })}>Zurück</Link> : <span />}
            <span className="gedaempft">Seite {f.seite} von {seiten}</span>
            {f.seite < seiten ? <Link className="knopf knopf-rand" href={filterZuUrl({ ...f, seite: f.seite + 1 })}>Weiter</Link> : <span />}
          </nav>
        </section>
      </div>
    </>
  );
}
