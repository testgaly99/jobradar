import { notFound } from "next/navigation";
import { aktuellerNutzer } from "@/lib/nutzer";
import { createAdminClient } from "@/lib/supabase/admin";
import { istAdmin } from "@/lib/admin";
import { nutzerZeilen } from "@/lib/nutzerliste";
import { LoeschForm } from "../../bewerbungen/knoepfe";
import { nutzerEntfernen } from "./actions";

type Einblicke = { pro_nutzer: { id: string; bewerbungen: number }[]; aktiv_7: number; aktiv_30: number; bewerbungen_pro_woche: { woche: string; anzahl: number }[] };

export default async function Seite({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const n = await aktuellerNutzer();
  if (!n?.admin) notFound();
  const { fehler } = await searchParams;
  const sb = createAdminClient();
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error("Nutzerliste konnte nicht geladen werden.");
    users.push(...data.users);
    if (data.users.length < 100) break;
  }
  const zeilen = nutzerZeilen(users);
  // Ein einziger Aufruf, gezählt wird in der Datenbank. Fehler = Migration 005 fehlt noch.
  const { data, error } = await sb.rpc("admin_einblicke");
  const e = error || !data ? null : (data as Einblicke);
  const proNutzer = new Map(e?.pro_nutzer.map((p) => [p.id, p.bewerbungen]));
  const wochen = e?.bewerbungen_pro_woche ?? [];
  const summe = wochen.reduce((s, w) => s + w.anzahl, 0);
  const max = Math.max(1, ...wochen.map((w) => w.anzahl));
  return (
    <div className="karte">
      <h1>Nutzer</h1>
      {e ? (
        <>
          <p>Aktiv in 7 Tagen: <strong>{e.aktiv_7}</strong> · Aktiv in 30 Tagen: <strong>{e.aktiv_30}</strong> · Bewerbungen der letzten 8 Wochen: <strong>{summe}</strong></p>
          <table>
            <caption className="gedaempft klein">Bewerbungen pro Woche (Wochenbeginn)</caption>
            <tbody>
              {wochen.map((w) => (
                <tr key={w.woche}>
                  <th scope="row">{w.woche.split("-").reverse().join(".")}</th>
                  <td><div className="balken" style={{ width: `${(w.anzahl / max) * 100}%` }} /></td>
                  <td>{w.anzahl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="gedaempft">Einblicke nach Migration 005</p>
      )}
      <p>Neue Freunde: In der Google Cloud Console als Testnutzer eintragen, dann den Link zur Website schicken.</p>
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
      <table>
        <thead><tr><th>Name</th><th>E-Mail</th><th>dabei seit</th><th>letzte Anmeldung</th>{e && <th>Bewerbungen</th>}<th></th></tr></thead>
        <tbody>
          {zeilen.map((z) => (
            <tr key={z.id}>
              <td>{z.name}</td>
              <td>{z.email}</td>
              <td>{z.dabeiSeit}</td>
              <td>{z.letzteAnmeldung}</td>
              {e && <td>{proNutzer.get(z.id) ?? 0}</td>}
              <td>
                {istAdmin(z.email, process.env.ADMIN_EMAIL) || z.id === n.id ? "Admin" : (
                  <details className="menue">
                    <summary aria-label="Aktionen">…</summary>
                    <LoeschForm
                      action={nutzerEntfernen.bind(null, z.id)}
                      frage={`${z.name || z.email} entfernen? Bitte die Person vorher, ihre Daten zu exportieren. Alle Bewerbungen und Dateien werden endgültig gelöscht.`}
                      text="Entfernen"
                    />
                  </details>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
