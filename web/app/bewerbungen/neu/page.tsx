import { LinkFormular } from "../knoepfe";
import UnterNav from "../unternav";
import Woche from "../woche";

export default function Seite() {
  return (
    <>
      <h1>Bewerbungen</h1>
      <Woche />
      <UnterNav aktiv="neu" />
      <section className="karte block" aria-labelledby="anlegen-titel">
        <h2 id="anlegen-titel">Bewerbung hinzufügen</h2>
        <LinkFormular />
      </section>
    </>
  );
}
