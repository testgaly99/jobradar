import { notFound } from "next/navigation";
import { aktuellerNutzer } from "@/lib/nutzer";
import { createAdminClient } from "@/lib/supabase/admin";
import { istAdmin } from "@/lib/admin";
import { nutzerZeilen } from "@/lib/nutzerliste";
import { LoeschForm } from "../../bewerbungen/knoepfe";
import { nutzerEntfernen } from "./actions";

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
  return (
    <div className="karte">
      <h1>Nutzer</h1>
      <p>Neue Freunde: In der Google Cloud Console als Testnutzer eintragen, dann den Link zur Website schicken.</p>
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
      <table>
        <thead><tr><th>Name</th><th>E-Mail</th><th>dabei seit</th><th></th></tr></thead>
        <tbody>
          {zeilen.map((z) => (
            <tr key={z.id}>
              <td>{z.name}</td>
              <td>{z.email}</td>
              <td>{z.dabeiSeit}</td>
              <td>
                {istAdmin(z.email, process.env.ADMIN_EMAIL) || z.id === n.id ? "Admin" : (
                  <LoeschForm
                    action={nutzerEntfernen.bind(null, z.id)}
                    frage={`${z.name === "–" ? z.email : z.name} entfernen? Bitte die Person vorher, ihre Daten zu exportieren. Alle Bewerbungen und Dateien werden endgültig gelöscht.`}
                    text="Entfernen"
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
