import { impressum } from "@/lib/impressum";

export const metadata = { title: "Impressum – Jobradar" };
// Werte kommen zur Laufzeit aus den Vercel-Einstellungen: geänderte Angaben gelten ohne neuen Bau, fehlende brechen den Bau nicht.
export const dynamic = "force-dynamic";

export default function Seite() {
  const i = impressum();
  return (
    <div className="karte prosa">
      <h1>Impressum</h1>
      {i ? (
        <>
          <p>Angaben gemäß § 5 DDG</p>
          <p>{i.name}<br />{i.strasse}<br />{i.ort}</p>
          <p>E-Mail: <a href={`mailto:${i.email}`}>{i.email}</a></p>
          <p>Jobradar ist ein privates, nicht-kommerzielles Projekt.</p>
        </>
      ) : (
        <p>Impressum noch nicht eingerichtet.</p>
      )}
    </div>
  );
}
