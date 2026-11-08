import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { firmenFarbe } from "@/lib/farbe";
import { AUSGEBLENDET_BRANCHE, GROESSEN_REIHENFOLGE, GRUPPEN, filterZuUrl, heuteLokal, istNeu, leseFilter, levelText, stadtAnzeige, tagePlus, type Gruppe } from "@/lib/filter";
import { PRO_SEITE, stellenAbfrage } from "@/lib/stellen";
import { merken } from "./actions";
import FilterBlock from "./filterblock";
import { SendeKnopf } from "../bewerbungen/knoepfe";

const TITEL: Record<Gruppe, string> = {
  groesse: "Größe", kategorie: "Branche", level: "Erfahrungslevel", modell: "Arbeitsmodell",
  vertrag: "Vertragsart", bereich: "Funktion", firma: "Unternehmen", stadt: "Stadt", land: "Land",
};
type Facetten = Partial<Record<Gruppe, Record<string, number>>>;
type Job = {
  id: string; unternehmen: string; titel: string; ort: string | null; staedte: string[] | null; remote: boolean | null;
  arbeitsmodell: string | null; vertragsart: string | null; abteilung: string | null; erfahrungslevel: string | null;
  url: string | null; erstmals_gesehen: string | null;
  companies: { groesse_klasse: string | null; kategorie: string[] | null };
};

const bekannt = (s: string | null) => (s && s.toLowerCase() !== "unbekannt" ? s : null);
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
  const jetzt = new Date();
  const fa: Facetten = fac.error ? {} : (fac.data ?? {});
  const hatZahlen = !fac.error;
  const seiten = Math.max(1, Math.ceil(gesamt / PRO_SEITE));
  const aktiv = GRUPPEN.reduce((n, g) => n + f[g].length, 0) + (f.q ? 1 : 0) + (f.seit ? 1 : 0);
  // Eine Abfrage für alle angezeigten Stellen: welche sind schon gemerkt oder beworben? (RLS liefert nur eigene Zeilen)
  const status = new Map<string, string>();
  if (jobs.length) {
    const { data } = await sb.from("applications").select("job_id,status").in("job_id", jobs.map((j) => j.id));
    for (const a of data ?? []) status.set(a.job_id, a.status);
  }

  return (
    <>
      {veraltet && letzterLauf && (
        <p className="meldung fehler" role="alert">Letzter Lauf am {datumDe(letzterLauf)} – automatischen Abruf prüfen</p>
      )}
      <div className="stellen-layout">
        <aside className="filterleiste">
          <FilterBlock titel={aktiv ? `Filter (${aktiv} aktiv)` : "Filter"}>
            <form method="get" action="/stellen" className="filterform">
              <label>Stichwort (im Titel)
                <input type="search" name="q" defaultValue={f.q} />
              </label>
              <label className="option">
                <input type="checkbox" name="volltext" value="1" defaultChecked={f.volltext} />
                <span>Auch im Anzeigentext suchen</span>
              </label>
              <fieldset className="gruppe">
                <legend>Online seit</legend>
                <div className="optionen">
                  {([["", "Egal"], ["heute", "Heute"], ["3", "3 Tage"], ["7", "7 Tage"], ["30", "30 Tage"]] as const).map(([w, t]) => (
                    <label key={w} className="option">
                      <input type="radio" name="seit" value={w} defaultChecked={f.seit === w} />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="filteraktionen">
                <button className="knopf" type="submit">Filtern</button>
                <Link className="knopf knopf-rand" href="/stellen">Filter zurücksetzen</Link>
              </div>
              {hatZahlen && <p className="gedaempft klein">Anzahl gesamt, nicht nach aktuellem Filter.</p>}
              {GRUPPEN.map((g) => {
                const werte = fa[g] ?? {};
                // Gewählte Werte bleiben sichtbar, auch wenn sie in den Zahlen fehlen
                const rang = (n: string) => { const i = GROESSEN_REIHENFOLGE.indexOf(n); return i < 0 ? 99 : i; };
                const namen = [...new Set([...Object.keys(werte), ...f[g]])]
                  .filter((n) => !(g === "kategorie" && n === AUSGEBLENDET_BRANCHE))
                  .sort((a, b) => (g === "groesse" ? rang(a) - rang(b) : 0) || a.localeCompare(b, "de"));
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
              const ort = j.staedte?.length ? stadtAnzeige(j.staedte, f.stadt) : j.ort;
              const neu = !!(j.erstmals_gesehen && istNeu(j.erstmals_gesehen, jetzt));
              const gr = bekannt(j.companies?.groesse_klasse ?? null);
              const lv = bekannt(j.erfahrungslevel);
              const chips = [gr && (gr + " Mitarbeitende"), lv && levelText(lv), bekannt(j.arbeitsmodell), bekannt(j.vertragsart)].filter(Boolean) as string[];
              const branchen = (j.companies?.kategorie ?? []).filter((k) => k !== AUSGEBLENDET_BRANCHE);
              const st = status.get(j.id);
              return (
                <li key={j.id} className="karte stelle" style={{ "--akzent": firmenFarbe(j.unternehmen) } as React.CSSProperties}>
                  <h2><Link href={"/stellen/" + encodeURIComponent(j.id)}>{j.titel}</Link></h2>
                  <p className="firma" style={{ color: firmenFarbe(j.unternehmen) }}>{j.unternehmen}</p>
                  <p className="gedaempft">{[ort, bekannt(j.abteilung)].filter(Boolean).join(" · ")}</p>
                  <p className="chips">
                    {neu && <span className="chip chip-neu" title="Seit höchstens 3 Tagen online">Neu</span>}
                    {chips.map((c) => <span key={c} className="chip">{c}</span>)}
                  </p>
                  {!!branchen.length && <p className="gedaempft klein">{branchen.join(", ")}</p>}
                  {j.erstmals_gesehen && <p className="gedaempft klein">Online seit: {datumDe(j.erstmals_gesehen)}</p>}
                  {st ? (
                    <button className="knopf knopf-rand knopf-schmal" type="button" disabled>{st === "gemerkt" ? "Gemerkt ✓" : "Beworben"}</button>
                  ) : (
                    <form action={merken.bind(null, j.id)}>
                      <SendeKnopf text="Merken" klasse="knopf knopf-rand knopf-schmal" />
                    </form>
                  )}
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
