import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { aktuellerNutzer } from "@/lib/nutzer";
import { firmenFarbe } from "@/lib/farbe";
import { datumDe } from "@/lib/bewerbung";
import { AUSGEBLENDET_BRANCHE, GRUPPEN, RANKING_KATEGORIEN, SORTIERUNG, facettenSortieren, filterZuUrl, heuteLokal, istNeu, landNurMitFacette, leseFilter, levelText, sortCookie, standardSortierung, stadtAnzeige, tagePlus, type Gruppe, type Sortierung } from "@/lib/filter";
import { istUmgerechnet, UMGERECHNET_HINWEIS, kurzzeile, modellText, leseSteckbrief, waehleFelder } from "@/lib/steckbrief";
import { PRO_SEITE, stellenAbfrage } from "@/lib/stellen";
import { passungVerfuegbar } from "@/lib/passung";
import { merken, entmerken } from "./actions";
import AnzeigeAufklappen from "./anzeige-aufklappen";
import FilterBlock from "./filterblock";
import FilterClient from "./filter-client";
import SortierAuswahl from "./sortierung";
import { SendeKnopf } from "../bewerbungen/knoepfe";
import FirmenLogo from "../firmenlogo";
import Ranglisten from "../ranglisten";
import { ladeRankingKatalog, ladeRankingKategorien, ladeRankingZuordnungen, ladeStoebernLinks, rankingFilter, rankingHinweis } from "@/lib/rankings";
import { STUFEN, deutschText, deutschWirksam, leseDeutsch } from "@/lib/sprachniveau";

// Spalte jobs.deutsch_stufe fehlt (Migration 013 offen): Postgres 42703, PostgREST PGRST204
const OHNE_DEUTSCH_SPALTE = ["42703", "PGRST204"];

// Postgres 42P01/42501, PostgREST PGRST200/201/205: View fehlt, nicht lesbar oder Einbettung nicht erkannt
const PASSUNG_FEHLT = ["42P01", "42501", "PGRST200", "PGRST201", "PGRST205"];

const TITEL: Record<Gruppe, string> = {
  liste: "Liste",
  rangkategorie: "Kategorie",
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

export default async function Seite({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  let roh = leseFilter(sp);
  const sb = await createClient();
  const nutzer = await aktuellerNutzer();
  const passung = await passungVerfuegbar(sb, nutzer);
  // Gemerkte Sortierung (Cookie) gilt ohne gültiges sort in der Adresse (auch alte Adressen mit sort=firma/titel).
  const s0 = [sp.sort].flat()[0];
  if (!s0 || (s0 !== "rang" && !(SORTIERUNG as readonly string[]).includes(s0))) {
    const c = sortCookie((await cookies()).get("stellen_sort")?.value);
    roh = { ...roh, sort: standardSortierung(passung, c.sort), richtung: sp.dir ? roh.richtung : c.dir ?? "ab", rangliste: sp.rl ? roh.rangliste : c.rl ?? "alle" };
  }
  const fehler = typeof sp.fehler === "string" ? sp.fehler : null;
  // Facetten zuerst: ohne Migration 005 fehlt "land", dann wird ein ?land= ignoriert statt die Abfrage zu sprengen.
  const fac = await sb.rpc("facetten"); // fehlt die Funktion noch (002_facetten.sql), gibt es Filter ohne Zahlen
  const fa: Facetten = fac.error ? {} : (fac.data ?? {});
  // Besucher ohne Konto dürfen den Anzeigentext nicht lesen (Migration 007): Suche und Ausschluss nur im Titel.
  const katalog = await ladeRankingKatalog(sb, !!nutzer);
  const f = rankingFilter(landNurMitFacette(roh, !!fa.land), !!nutzer);
  // Nur angebotene Sortierungen gelten: ein nicht verfügbares ?sort=passung oder Cookie sortiert nie und zeigt kein falsches Feld.
  const sortOptionen: Sortierung[] = [...(passung ? ["passung" as const] : []), "neu", "groesse", ...(nutzer && katalog.verfuegbar ? ["rangliste" as const] : [])];
  if (!sortOptionen.includes(f.sort)) f.sort = "neu";
  if (f.rangliste !== "alle" && !katalog.listen.some((l) => l.id === f.rangliste)) f.rangliste = "alle";
  const listenHinweis = rankingHinweis(f, katalog);
  const listeGesperrt = !!listenHinweis && f.liste.length > 0;
  // Gespeicherte Spracheinstellung (Konto); fehlt die Tabelle (Migration 013), gilt nur die Adresse.
  const sprach = nutzer ? await sb.from("sprach_einstellung").select("zeigen,niveau").maybeSingle() : { data: null, error: null };
  let deutsch = deutschWirksam(f.deutsch, sprach.error ? null : sprach.data?.niveau, !!nutzer);
  let [ergebnis, lauf, erster] = await Promise.all([
    listeGesperrt ? { data: [], count: 0, error: null } : stellenAbfrage(sb, { ...f, deutsch }),
    sb.from("laeufe").select("datum").order("datum", { ascending: false }).limit(1).maybeSingle(),
    sb.from("laeufe").select("datum").order("datum", { ascending: true }).limit(1).maybeSingle(), // fehlt die Tabelle: nur 3-Tage-Regel
  ]);
  // View fehlt (Migration 027) oder nicht lesbar: Liste nach neu statt Fehlerseite.
  if (f.sort === "passung" && ergebnis.error && PASSUNG_FEHLT.includes(ergebnis.error.code ?? "")) {
    f.sort = "neu";
    ergebnis = await stellenAbfrage(sb, { ...f, deutsch });
  }
  const deutschFehlt = !!deutsch && OHNE_DEUTSCH_SPALTE.includes(ergebnis.error?.code ?? "");
  if (deutschFehlt) {
    deutsch = "";
    ergebnis = await stellenAbfrage(sb, { ...f, deutsch });
  }
  const ersterLauf: string | null = erster.data?.datum ?? null;
  const jobs = (ergebnis.data ?? []) as unknown as Job[];
  const gesamt = ergebnis.count ?? 0;
  const letzterLauf: string | null = lauf.data?.datum ?? null;
  const veraltet = letzterLauf !== null && letzterLauf < tagePlus(heuteLokal(), -2);
  const jetzt = new Date();
  const seiten = Math.max(1, Math.ceil(gesamt / PRO_SEITE));
  const aktiv = GRUPPEN.reduce((n, g) => n + f[g].length, 0) + (f.q ? 1 : 0) + (f.ohne ? 1 : 0) + (f.seit ? 1 : 0) + (deutsch ? 1 : 0);
  // Eine Abfrage für alle angezeigten Stellen: welche sind schon gemerkt oder beworben? (RLS liefert nur eigene Zeilen)
  const status = new Map<string, { status: string; id: string }>();
  const steckbriefe = new Map<string, unknown>();
  // Steckbrief-Spalte und Felder-Tabelle gibt es erst nach Migration 005: Fehler ergibt leeren Steckbrief bzw. Standardfelder.
  const felderZeile = nutzer ? await sb.from("listen_felder").select("felder").maybeSingle() : { data: null, error: null };
  const felder = waehleFelder(felderZeile.error ? null : felderZeile.data?.felder);
  const ranglisten = await ladeRankingZuordnungen(sb, !!nutzer && katalog.verfuegbar, jobs.map((j) => j.unternehmen));
  const [rankingKategorien, stoebern] = await Promise.all([
    ladeRankingKategorien(sb, !!nutzer, jobs.map((j) => j.unternehmen)),
    ladeStoebernLinks(sb, !!nutzer),
  ]);
  const logos = new Map<string, string>();
  if (jobs.length) {
    const ids = jobs.map((j) => j.id);
    const [apps, sbr, lg] = await Promise.all([
      nutzer ? sb.from("applications").select("id,job_id,status").in("job_id", ids) : { data: [] },
      sb.from("jobs").select("id,steckbrief").in("id", ids),
      // Besucher ohne Konto dürfen logo_url nicht lesen (Migration 007): dann Fehler, also nur Buchstaben-Kreise.
      sb.from("companies").select("name,logo_url").not("logo_url", "is", null),
    ]);
    for (const c of lg.error ? [] : (lg.data ?? [])) logos.set(c.name, c.logo_url);
    for (const a of apps.data ?? []) status.set(a.job_id, { status: a.status, id: a.id });
    for (const s of sbr.error ? [] : (sbr.data ?? [])) steckbriefe.set(s.id, s.steckbrief);
  }

  return (
    <>
      {veraltet && letzterLauf && (
        <p className="meldung fehler" role="alert">Letzter Lauf am {datumDe(letzterLauf)}. Automatischen Abruf prüfen.</p>
      )}
      <div className="seitenkopf">
        <h1>Stellen</h1>
        <p className="gedaempft">
          <span className="num">{gesamt}</span> Treffer{letzterLauf && `, Stand ${datumDe(letzterLauf)}`}
        </p>
      </div>
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
      {listenHinweis && <p className="meldung hinweis" role="status">{listenHinweis} <Link href={filterZuUrl({ ...f, liste: [], sort: f.sort === "rangliste" ? "neu" : f.sort, seite: 1 })}>Listenfilter zurücksetzen</Link></p>}
      {ranglisten.fehler && <p className="meldung hinweis" role="status">{ranglisten.fehler}</p>}
      {rankingKategorien.fehler && <p className="meldung hinweis" role="status">{rankingKategorien.fehler}</p>}
      {deutschFehlt && <p className="meldung hinweis" role="status">Deutsch-Filter geht erst nach Migration 013.</p>}
      {ergebnis.error && ergebnis.error.code !== "PGRST103" && <p className="meldung fehler">Stellen konnten nicht geladen werden.</p>}
      <div className="stellen-layout">
        <aside className="filterleiste">
          <FilterBlock titel={aktiv ? `Filter (${aktiv} aktiv)` : "Filter"}>
            <FilterClient aktion="/stellen" listeId="stellenliste">
              <div className="suchzeile">
                <label>Stichwort (im Titel)
                  <input type="search" name="q" defaultValue={f.q} />
                </label>
                <button className="knopf" type="submit">Suchen</button>
              </div>
              <details className="gruppe ausschluss" open={!!f.ohne}>
                <summary>Wörter ausschließen{f.ohne && " (aktiv)"}</summary>
                <label>Stellen ohne diese Wörter
                  <input type="search" name="ohne" defaultValue={f.ohne} placeholder="z. B. Praktikum, Sales…" />
                </label>
                <p className="gedaempft klein">Mehrere durch Komma trennen. Gilt für den Titel{nutzer && ", mit Häkchen unten auch für den Anzeigentext"}. Enter oder „Suchen“ wendet an.</p>
              </details>
              {nutzer && (
                <label className="option">
                  <input type="checkbox" name="volltext" value="1" defaultChecked={f.volltext} />
                  <span>Auch im Anzeigentext suchen</span>
                </label>
              )}
              <input type="hidden" name="sort" value={f.sort} />
              {f.richtung === "auf" && <input type="hidden" name="dir" value="auf" />}
              {f.rangliste !== "alle" && <input type="hidden" name="rl" value={f.rangliste} />}
              {nutzer && (
                <label>Mein Deutschniveau
                  {/* "egal" muss eine gespeicherte Wahl für diesen Aufruf überstimmen ("alle"), sonst entfällt der Parameter */}
                  <select key={deutsch} name="deutsch" defaultValue={deutsch || (sprach.data?.niveau ? "alle" : "")}>
                    <option value={sprach.data?.niveau ? "alle" : ""}>Egal</option>
                    {STUFEN.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className="gedaempft klein">Zeigt Stellen bis zu diesem Niveau, dazu solche ohne Deutsch-Pflicht oder ohne Angabe. Dauerhaft unter Konto.</span>
                </label>
              )}
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
                <Link className="knopf knopf-rand" href="/stellen">Filter zurücksetzen</Link>
              </div>
              {nutzer && (katalog.listen.length > 0 || f.liste.length > 0) && (
                <details className="gruppe" open>
                  <summary>Liste{f.liste.length > 0 && ` (${f.liste.length})`}</summary>
                  <div className="optionen">
                    {[...new Set([...katalog.listen.map((l) => l.id), ...f.liste])].map((id) => {
                      const l = katalog.listen.find((l) => l.id === id);
                      return <label key={id} className="option">
                        <input type="checkbox" name="liste" value={id} defaultChecked={f.liste.includes(id)} />
                        <span>{l ? `${l.name} (${l.anzahl})` : `Nicht mehr verfügbar: ${id}`}</span>
                      </label>;
                    })}
                  </div>
                </details>
              )}
              {nutzer && (
                <details className="gruppe" open>
                  <summary>Kategorie{f.rangkategorie.length > 0 && ` (${f.rangkategorie.length})`}</summary>
                  <div className="optionen">
                    {[...new Set([...RANKING_KATEGORIEN, ...f.rangkategorie])].map((k) => (
                      <label key={k} className="option">
                        <input type="checkbox" name="rangkategorie" value={k} defaultChecked={f.rangkategorie.includes(k)} />
                        <span>{k}</span>
                      </label>
                    ))}
                  </div>
                </details>
              )}
              {GRUPPEN.filter((g) => g !== "liste" && g !== "rangkategorie").map((g) => {
                const werte = fa[g] ?? {};
                // Gewählte Werte bleiben sichtbar, auch wenn sie in den Zahlen fehlen
                const namen = facettenSortieren(g, [...new Set([...Object.keys(werte), ...f[g]])]
                  .filter((n) => !(g === "kategorie" && n === AUSGEBLENDET_BRANCHE))
                );
                if (!namen.length) return null;
                return (
                  <details key={g} className="gruppe" open={g === "groesse" || g === "kategorie" || f[g].length > 0}>
                    <summary>{TITEL[g]}{f[g].length > 0 && ` (${f[g].length})`}</summary>
                    <div className="optionen">
                      {namen.map((n) => (
                        <label key={n} className="option">
                          <input type="checkbox" name={g} value={n} defaultChecked={f[g].includes(n)} />
                          <span>{g === "level" ? levelText(n) : g === "groesse" ? n + " Mitarbeitende" : n}</span>
                        </label>
                      ))}
                    </div>
                  </details>
                );
              })}
            </FilterClient>
          </FilterBlock>
          {stoebern.length > 0 && (
            <details className="gruppe">
              <summary>Rankings zum Stöbern</summary>
              <ul>
                {stoebern.map((l) => <li key={l.id}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer">{l.titel}</a>
                  <p className="gedaempft klein">Stand: {datumDe(l.geprueft_am)}</p>
                </li>)}
              </ul>
            </details>
          )}
        </aside>

        <section aria-label="Stellen">
          {!listeGesperrt && (!ergebnis.error || ergebnis.error.code === "PGRST103") && jobs.length === 0 && <p className="leer">Keine Stellen für diese Auswahl.</p>}
          <SortierAuswahl filter={f} optionen={sortOptionen} listen={katalog.listen} />
          <ul className="stellenliste" id="stellenliste">
            {jobs.map((j) => {
              const ort = j.staedte?.length ? stadtAnzeige(j.staedte, f.stadt) : j.ort;
              const neu = !!(j.erstmals_gesehen && istNeu(j.erstmals_gesehen, jetzt, ersterLauf));
              const kurz = kurzzeile({
                groesse: j.companies?.groesse_klasse ?? null, level: j.erfahrungslevel,
                modell: modellText(j.arbeitsmodell, j.remote), vertrag: j.vertragsart, ort,
                erstmalsGesehen: j.erstmals_gesehen, steckbrief: leseSteckbrief(steckbriefe.get(j.id)),
                branchen: (j.companies?.kategorie ?? []).filter((k) => k !== AUSGEBLENDET_BRANCHE),
              }, felder);
              const app = status.get(j.id);
              const st = app?.status;
              // Bei aktivem Deutsch-Filter ausdrücklich sagen, warum eine Stelle trotz Filter erscheint
              const de = deutsch ? leseDeutsch((steckbriefe.get(j.id) as { deutsch?: unknown } | null)?.deutsch) : null;
              const deHinweis = de && (de.status === "vorteil" || de.status === "ohne_niveau") ? deutschText(de) : null;
              return (
                <li key={j.id} className="stelle" style={{ "--firma-h": firmenFarbe(j.unternehmen) } as React.CSSProperties}>
                  <FirmenLogo firma={j.unternehmen} url={logos.get(j.unternehmen)} gross />
                  <div className="stelle-text">
                    <h2><Link href={"/stellen/" + encodeURIComponent(j.id)}>{j.titel}</Link></h2>
                    <p className="meta">
                      <span className="firma">{j.unternehmen}</span>
                      {bekannt(j.abteilung) && <span className="gedaempft">{j.abteilung}</span>}
                      {neu && <span className="chip chip-neu" title="Seit höchstens 3 Tagen online">Neu</span>}
                    </p>
                    <Ranglisten zuordnungen={ranglisten.zuordnungen.filter((z) => z.unternehmen === j.unternehmen)} />
                    {rankingKategorien.kategorien.filter((z) => z.unternehmen === j.unternehmen).map((z) =>
                      <span className="chip" key={z.kategorie}>{z.kategorie}</span>)}
                    {kurz.length > 0 && (
                      <ul className="kurz" aria-label="Kurzbeschreibung">
                        {kurz.map((e) => <li key={e.feld} title={e.feld === "gehalt" && istUmgerechnet(e.text) ? UMGERECHNET_HINWEIS : undefined}>{e.text}</li>)}
                      </ul>
                    )}
                    {deHinweis && <p className="gedaempft klein">{deHinweis}</p>}
                    {nutzer && <AnzeigeAufklappen jobId={j.id} />}
                  </div>
                  {!nutzer ? (
                    <Link className="knopf knopf-rand knopf-schmal" href="/login">Anmelden zum Merken</Link>
                  ) : st === "gemerkt" ? (
                    <form action={entmerken.bind(null, j.id)}>
                      <SendeKnopf text="Gemerkt ✓" klasse="knopf knopf-zustand knopf-schmal ist-gemerkt" gedrueckt title="Klicken, um nicht mehr zu merken" />
                    </form>
                  ) : app ? (
                    // Ab "beworben" kein Umschalter mehr: ein Klick würde Status zurücksetzen, ein zweiter die Bewerbung samt Eingaben löschen.
                    <Link className="knopf knopf-zustand knopf-schmal" href={`/bewerbung/${app.id}`} title="Zur Bewerbung">Beworben ✓</Link>
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
