"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { istUuid } from "@/lib/bewerbung";
import { createClient } from "@/lib/supabase/server";
import { aktuellerNutzer } from "@/lib/nutzer";
import { bestaetigt } from "@/lib/bestaetigung";
import { selbstLoeschenErlaubt, begriffPruefen } from "@/lib/nutzerliste";
import { loescheNutzer } from "@/lib/nutzer-loeschen";

function zurueck(m: string): never {
  redirect(`/konto?fehler=${encodeURIComponent(m)}`);
}

export async function kontoLoeschen(formData: FormData) {
  const n = await aktuellerNutzer();
  if (!n) redirect("/login");
  const verboten = selbstLoeschenErlaubt({ istAdmin: n.admin, adminEnv: process.env.ADMIN_EMAIL });
  if (verboten) zurueck(verboten);
  if (!bestaetigt(String(formData.get("bestaetigung") ?? ""))) zurueck("Bitte tippe LÖSCHEN ein, um das Konto zu löschen.");
  let fehler = "";
  try {
    await loescheNutzer(n.id);
  } catch (e) {
    console.error("kontoLoeschen:", e);
    fehler = "Löschen fehlgeschlagen. Bitte später erneut versuchen.";
  }
  if (fehler) zurueck(fehler);
  await (await createClient()).auth.signOut().catch(() => {}); // Nutzer ist weg; Cookie trotzdem räumen
  redirect("/login?geloescht=1");
}

const MAX_BEGRIFFE = 50;

export async function begriffHinzufuegen(formData: FormData) {
  const n = await aktuellerNutzer();
  if (!n) redirect("/login");
  const begriff = begriffPruefen(String(formData.get("begriff") ?? ""));
  if (!begriff) zurueck("Der Begriff muss 2 bis 60 Zeichen lang sein.");
  const sb = await createClient();
  const { count, error: ez } = await sb.from("wichtige_punkte").select("id", { count: "exact", head: true });
  if (ez) zurueck("Wichtige Punkte sind erst nach Migration 005 verfügbar.");
  if ((count ?? 0) >= MAX_BEGRIFFE) zurueck(`Du kannst höchstens ${MAX_BEGRIFFE} Begriffe speichern.`);
  const { error } = await sb.from("wichtige_punkte").insert({ begriff });
  if (error?.code === "23505") zurueck("Diesen Begriff hast du schon.");
  if (error) zurueck("Speichern fehlgeschlagen. Bitte später erneut versuchen.");
  revalidatePath("/konto");
}

export async function begriffEntfernen(id: string) {
  const n = await aktuellerNutzer();
  if (!n) redirect("/login");
  if (!istUuid(id)) zurueck("Ungültige ID.");
  const { error } = await (await createClient()).from("wichtige_punkte").delete().eq("id", id);
  if (error) zurueck("Entfernen fehlgeschlagen. Bitte später erneut versuchen.");
  revalidatePath("/konto");
}
