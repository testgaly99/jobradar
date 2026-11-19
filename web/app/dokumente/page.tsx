import { redirect } from "next/navigation";

// Alter Reiter "Dokumente" heißt jetzt "Unterlagen".
export default function Seite() {
  redirect("/unterlagen");
}
