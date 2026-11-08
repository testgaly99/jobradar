import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS, STATUS_LABEL, type Status } from "@/lib/bewerbung";
import { statusWechseln } from "../detail-actions";
import { SendeKnopf } from "../knoepfe";
import UnterNav from "../unternav";

type Karte = { id: string; firma: string | null; titel: string | null; status: Status; interesse: number | null };

export default async function Seite() {
  const sb = await createClient();
  const { data, error } = await sb.from("applications").select("id,firma,titel,status,interesse").order("geaendert_am", { ascending: false }).limit(500);
  const karten = (data ?? []) as Karte[];
  return (
    <>
      <h1>Bewerbungen</h1>
      <UnterNav aktiv="kanban" />
      {error && <p className="meldung fehler">Bewerbungen konnten nicht geladen werden.</p>}
      <div className="kanban" role="region" aria-label="Kanban-Ansicht" tabIndex={0}>
        {STATUS.map((s) => {
          const spalte = karten.filter((k) => k.status === s);
          return (
            <section key={s} className="spalte" aria-label={STATUS_LABEL[s]}>
              <h2>{STATUS_LABEL[s]} <span className="chip num">{spalte.length}</span></h2>
              {spalte.map((k) => (
                <article key={k.id} className="karte kanbankarte">
                  <h3><Link href={`/bewerbungen/${k.id}`}>{k.firma || "(ohne Firma)"}</Link></h3>
                  <p>{k.titel}</p>
                  {k.interesse && <p className="gedaempft klein">Interesse {k.interesse} von 5</p>}
                  <form action={statusWechseln.bind(null, k.id)} className="statusform">
                    <label>Status
                      <select name="status" defaultValue={k.status}>
                        {STATUS.map((o) => <option key={o} value={o}>{STATUS_LABEL[o]}</option>)}
                      </select>
                    </label>
                    <SendeKnopf text="Ändern" klasse="knopf knopf-rand" />
                  </form>
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
