import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  STATUS, STATUS_LABEL, datumDe, escapeLike, leseTabelle, tabelleZuUrl, tagDe,
  type SortSpalte, type Status,
} from "@/lib/bewerbung";
import { LinkFormular } from "./knoepfe";
import UnterNav from "./unternav";

const SPALTEN: [SortSpalte, string][] = [
  ["firma", "Firma"], ["titel", "Titel"], ["status", "Status"], ["interesse", "Interesse"],
  ["beworben_am", "Beworben am"], ["naechster_schritt_faellig", "Nächster Schritt"], ["geaendert_am", "Geändert"],
];
type Zeile = {
  id: string; firma: string | null; titel: string | null; status: Status; interesse: number | null; beworben_am: string | null;
  naechster_schritt: string | null; naechster_schritt_faellig: string | null; geaendert_am: string;
};

export default async function Seite({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = leseTabelle(await searchParams);
  const sb = await createClient();
  let q = sb.from("applications")
    .select("id,firma,titel,status,interesse,beworben_am,naechster_schritt,naechster_schritt_faellig,geaendert_am")
    .order(f.sort, { ascending: f.dir === "asc", nullsFirst: false })
    .limit(500);
  if (f.status.length) q = q.in("status", f.status);
  if (f.firma) q = q.ilike("firma", `%${escapeLike(f.firma)}%`);
  if (f.interesse) q = q.gte("interesse", f.interesse);
  const { data, error } = await q;
  const zeilen = (data ?? []) as Zeile[];
  const aktiv = f.status.length > 0 || !!f.firma || !!f.interesse;

  return (
    <>
      <h1>Bewerbungen</h1>
      <UnterNav aktiv="tabelle" />
      <div className="karte block">
        <LinkFormular />
      </div>
      <form method="get" action="/bewerbungen" className="karte block filterform">
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
          <label>Firma
            <input type="search" name="firma" defaultValue={f.firma} />
          </label>
          <label>Interesse mindestens
            <select name="interesse" defaultValue={f.interesse ?? ""}>
              <option value="">egal</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        {f.sort !== "geaendert_am" && <input type="hidden" name="sort" value={f.sort} />}
        {f.dir === "asc" && <input type="hidden" name="dir" value="asc" />}
        <div className="filteraktionen aktionsreihe">
          <button className="knopf" type="submit">Filtern</button>
          {aktiv && <Link className="knopf knopf-rand" href="/bewerbungen">Filter zurücksetzen</Link>}
        </div>
      </form>

      {error && <p className="meldung fehler">Bewerbungen konnten nicht geladen werden.</p>}
      {!error && zeilen.length === 0 && (
        <p className="karte">{aktiv ? "Keine Bewerbungen für diese Auswahl." : "Noch keine Bewerbungen. Lege eine aus einer Stelle, per Link oder manuell an."}</p>
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
                    <th key={key} scope="col" aria-sort={hier ? (f.dir === "asc" ? "ascending" : "descending") : "none"}>
                      <Link href={neu}>{name}{hier ? (f.dir === "asc" ? " ▲" : " ▼") : ""}</Link>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => (
                <tr key={z.id}>
                  <td><Link href={`/bewerbungen/${z.id}`}>{z.firma || "(ohne Firma)"}</Link></td>
                  <td>{z.titel}</td>
                  <td><span className="chip">{STATUS_LABEL[z.status]}</span></td>
                  <td>{z.interesse ?? ""}</td>
                  <td>{datumDe(z.beworben_am)}</td>
                  <td>{z.naechster_schritt}{z.naechster_schritt_faellig && ` (bis ${datumDe(z.naechster_schritt_faellig)})`}</td>
                  <td>{tagDe(z.geaendert_am)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
