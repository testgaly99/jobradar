import { redirect, RedirectType } from "next/navigation";

// Früherer Reiter "Manuell anlegen": das Formular steckt jetzt unter "Bewerbung anlegen" in der Tabelle.
export default function Seite() {
  redirect("/bewerbungen", RedirectType.replace);
}
