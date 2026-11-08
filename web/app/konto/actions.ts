"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { aktuellerNutzer } from "@/lib/nutzer";
import { bestaetigt } from "@/lib/bestaetigung";
import { loescheNutzer } from "@/lib/nutzer-loeschen";

function zurueck(m: string): never {
  redirect(`/konto?fehler=${encodeURIComponent(m)}`);
}

export async function kontoLoeschen(formData: FormData) {
  const n = await aktuellerNutzer();
  if (!n) redirect("/login");
  if (n.admin) zurueck("Das Admin-Konto kann nicht gelöscht werden.");
  if (!bestaetigt(String(formData.get("bestaetigung") ?? ""))) zurueck("Bitte tippe LÖSCHEN ein, um das Konto zu löschen.");
  let fehler = "";
  try {
    await loescheNutzer(n.id);
  } catch (e) {
    fehler = e instanceof Error ? e.message : "Das Konto konnte nicht gelöscht werden.";
  }
  if (fehler) zurueck(fehler);
  await (await createClient()).auth.signOut().catch(() => {}); // Nutzer ist weg; Cookie trotzdem räumen
  redirect("/login?geloescht=1");
}
