import { STATUS, STATUS_LABEL } from "@/lib/bewerbung";
import { bewerbungManuell } from "../detail-actions";
import { SendeKnopf } from "../knoepfe";
import UnterNav from "../unternav";

export default async function Seite({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const { fehler } = await searchParams;
  return (
    <>
      <h1>Bewerbung manuell anlegen</h1>
      <UnterNav aktiv="neu" />
      <form action={bewerbungManuell} className="karte formular block">
        {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
        <label>Firma (Pflicht)<input name="firma" required /></label>
        <label>Titel (Pflicht)<input name="titel" required /></label>
        <label>Link<input name="link" type="url" placeholder="https://…" /></label>
        <label>Status
          <select name="status" defaultValue="gemerkt">
            {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <SendeKnopf text="Anlegen" />
      </form>
    </>
  );
}
