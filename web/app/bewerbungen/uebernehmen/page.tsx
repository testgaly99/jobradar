import UnterNav from "../unternav";
import { UebernahmeFormular } from "./formular";

// Ziel des Lesezeichen-Knopfs. Nur mit Anmeldung erreichbar (proxy.ts), gespeichert wird erst per Klick.
export default function Seite() {
  return (
    <>
      <h1>Stelle übernehmen</h1>
      <UnterNav aktiv="uebernehmen" />
      <UebernahmeFormular />
    </>
  );
}
