import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  STATUS, STATUS_LABEL, datumDe, escapeLike, leseTabelle, tabelleZuUrl, tagDe,
  type SortSpalte, type Status,
} from "@/lib/bewerbung";
import { LinkFormular } from "./knoepfe";
import FilterClient from "../stellen/filter-client";
import UnterNav from "./unternav";
import Woche from "./woche";

// B11: diese Spalten fallen am Handy weg, damit die Tabelle ohne seitliches Wischen passt
const NUR_BREIT = new Set<SortSpalte>(["interesse", "beworben_am", "naechster_schritt_faellig", "geaendert_am"]);
const SPALTEN: [SortSpalte, string][] = [
  ["firma", "Firma"], ["titel", "Titel"], ["status", "Status"], ["interesse", "Interesse"],
  ["beworben_am", "Beworben am"], ["naechster_schritt_faellig", "Nächster Schritt"], ["geaendert_am", "Geändert"],
];
type Zeile = {
  id: string; firma: string | null; titel: string | null; status: Status; interesse: number | null; beworben_am: string | null;
  naechster_schritt: string | null; naechster_schritt_faellig: string | null; geaendert_am: string;
};

export default async function Seite({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const f = leseTabelle(sp);
  const sb = await createClient();
  let q = sb.from("applications")
    .select("id,firma,titel,status,interesse,beworben_am,naechster_schritt,naechster_schritt_faellig,geaendert_am")
    .order(f.sort, { ascending: f.dir === "asc", nullsFirst: false })
    .limit(500);
  if (!f.archiv && !f.status.length) q = q.neq("status", "abgeschlossen"); // ausdrücklich gewählte Status gelten immer
  if (f.status.length) q = q.in("status", f.status);
  if (f.firma) q = q.ilike("firma", `%${escapeLike(f.firma)}%`);
  if (f.interesse) q = q.gte("interesse", f.interesse);
  const { data, error } = await q;
  const zeilen = (data ?? []) as Zeile[];
  const aktiv = f.status.length > 0 || !!f.firma || !!f.interesse || f.archiv;

  return (
    <>
      <h1>Bewerbungen</h1>
      <Woche />
      <UnterNav aktiv="tabelle" sp={sp} />
      {/* B5: Anlegen ist Nebensache, die Liste ist die Hauptsache: zugeklappt, eine Zeile */}
      <details className="karte block">
        <summary>Bewerbung aus Link anlegen</summary>
        <LinkFormular />
      </details>
      <div className="karte block">
        <FilterClient aktion="/bewerbungen" listeId="bewerbungsliste" textFelder={["firma"]}>
          <fieldset className="statuswahl">
            <legend>Status</legend>
            {STATUS.map((s) => (
              <label key={s} className="option">
                <input type="checkbox" name="status" value={s} defaultChecked={f.status.includes(s)} />
                <span>{STATUS_LABEL[s]}</span>
              </label>
            ))}
          </fieldset>
          <div className="filterreihe">
            <div className="suchzeile">
              <label>Firma
                <input type="search" name="firma" defaultValue={f.firma} />
              </label>
              <button className="knopf" type="submit">Suchen</button>
            </div>
            <label>Interesse mindestens
              <select key={f.interesse ?? ""} name="interesse" defaultValue={f.interesse ?? ""}>
                <option value="">egal</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{"★".repeat(n)}{n < 5 ? " oder mehr" : ""}</option>)}
              </select>
            </label>
          </div>
          <label className="option">
            <input type="checkbox" name="archiv" value="1" defaultChecked={f.archiv} />
            <span>Archiv anzeigen</span>
          </label>
          {f.sort !== "geaendert_am" && <input type="hidden" name="sort" value={f.sort} />}
          {f.dir === "asc" && <input type="hidden" name="dir" value="asc" />}
          {aktiv && <div className="filteraktionen aktionsreihe"><Link className="knopf knopf-rand" href="/bewerbungen">Filter zurücksetzen</Link></div>}
        </FilterClient>
      </div>
      <div id="bewerbungsliste">
      {error && <p className="meldung fehler" role="alert">Bewerbungen konnten nicht geladen werden.</p>}
      {!error && zeilen.length === 0 && (
        <p className="leer">{aktiv ? "Keine Bewerbungen für diese Auswahl." : "Noch keine Bewerbungen. Lege eine aus einer Stelle, per Link oder manuell an."}</p>
      )}
      {zeilen.length > 0 && (
        <div className="tabelle-rahmen">
          <table className="tabelle">
            <thead>
              <tr>
                {SPALTEN.map(([key, name]) => {
                  const hier = f.sort === key;
                  const neu = tabelleZuUrl({ ...f, sort: key, dir: hier && f.dir === "desc" ? "asc" : "desc" });
                  return (
                    <th key={key} scope="col" className={NUR_BREIT.has(key) ? "nur-breit" : undefined} aria-sort={hier ? (f.dir === "asc" ? "ascending" : "descending") : "none"}>
                      <Link href={neu}>{name}{hier ? (f.dir === "asc" ? " ▲" : " ▼") : ""}</Link>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => (
                <tr key={z.id}>
                  <td><Link href={`/bewerbung/${z.id}`}>{z.firma || "(ohne Firma)"}</Link></td>
                  <td>{z.titel}</td>
                  <td><span className="chip" data-status={z.status}>{STATUS_LABEL[z.status]}</span></td>
                  <td className="nur-breit">{z.interesse && <span className="sterne" role="img" aria-label={`Interesse ${z.interesse} von 5`}>{"★".repeat(z.interesse)}{"☆".repeat(5 - z.interesse)}</span>}</td>
                  <td className="num nur-breit">{datumDe(z.beworben_am)}</td>
                  <td className="nur-breit">{z.naechster_schritt}{z.naechster_schritt_faellig && ` (bis ${datumDe(z.naechster_schritt_faellig)})`}</td>
                  <td className="num nur-breit">{tagDe(z.geaendert_am)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </>
  );
}
