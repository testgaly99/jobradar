import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS, STATUS_LABEL, leseTabelle, type SortSpalte } from "@/lib/bewerbung";
import { ladeDetail, ladeKarten } from "@/lib/tracker-daten";
import { vorauswahl } from "@/lib/tracker-karte";
import FilterClient from "../stellen/filter-client";
import UnterNav from "./unternav";
import Woche from "./woche";
import Board from "./kanban/board";
import Liste from "./liste";

const SORTIERUNG: [SortSpalte, string][] = [
  ["geaendert_am", "Zuletzt geändert"], ["firma", "Firma A bis Z"], ["titel", "Titel A bis Z"], ["status", "Status"],
  ["interesse", "Interesse"], ["beworben_am", "Beworben am"], ["naechster_schritt_faellig", "Nächster Schritt fällig"],
];
const eins = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// Meine Bewerbungen: eine Abfrage speist Board und Liste; Details nur für die gewählte Bewerbung.
export default async function Seite({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const f = leseTabelle(sp);
  const sb = await createClient();
  const { karten, ohneSpalten, fehler } = await ladeKarten(sb, f);
  const gewaehlt = vorauswahl(karten, eins(sp.id));
  const detail = gewaehlt ? await ladeDetail(sb, gewaehlt.id) : null;
  const aktiv = f.status.length > 0 || !!f.firma || !!f.interesse || f.archiv;
  // Archiv-Schalter behält die übrigen Filter in der Adresse.
  const umschalten = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (k !== "archiv" && k !== "id" && v !== undefined) [v].flat().forEach((w) => umschalten.append(k, w));
  if (!f.archiv) umschalten.set("archiv", "1");
  const q = umschalten.toString();

  return (
    <div className="kanban-bereich">
      <h1>Bewerbungen</h1>
      <Woche />
      <UnterNav aktiv="meine" sp={sp} />
      <p className="board-schalter">
        <Link href={q ? `/bewerbungen?${q}` : "/bewerbungen"} className="knopf knopf-rand knopf-schmal">
          {f.archiv ? "Archiv ausblenden" : "Archiv anzeigen"}
        </Link>
      </p>
      {fehler
        ? <p className="meldung fehler" role="alert">Bewerbungen konnten nicht geladen werden.</p>
        : <Board karten={karten} ohneSpalten={ohneSpalten} archiv={f.archiv} />}
      <h2>Alle Bewerbungen</h2>
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
          <label>Sortieren nach
            <select key={f.sort} name="sort" defaultValue={f.sort}>
              {SORTIERUNG.map(([w, t]) => <option key={w} value={w}>{t}</option>)}
            </select>
          </label>
          {aktiv && <div className="filteraktionen aktionsreihe"><Link className="knopf knopf-rand" href="/bewerbungen">Filter zurücksetzen</Link></div>}
        </FilterClient>
      </div>
      <div id="bewerbungsliste">
        {!fehler && karten.length === 0 && (
          <p className="leer">{aktiv ? "Keine Bewerbungen für diese Auswahl." : "Noch keine Bewerbungen. Lege eine aus einer Stelle oder über „+ Bewerbung hinzufügen“ an."}</p>
        )}
        {karten.length > 0 && <Liste karten={karten} gewaehlt={gewaehlt} detail={detail} sp={sp} />}
      </div>
    </div>
  );
}
