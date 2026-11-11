"use server";
import { notFound, redirect } from "next/navigation";
import { aktuellerNutzer } from "@/lib/nutzer";
import { createAdminClient } from "@/lib/supabase/admin";
import { loescheNutzer } from "@/lib/nutzer-loeschen";
import { entfernenErlaubt } from "@/lib/nutzerliste";
import { istUuid } from "@/lib/bewerbung";

function zurueck(m: string): never {
  redirect(`/admin/nutzer?fehler=${encodeURIComponent(m)}`);
}

export async function nutzerEntfernen(uid: string) {
  const n = await aktuellerNutzer();
  if (!n?.admin) notFound();
  if (!istUuid(uid)) zurueck("Ungültige Nutzer-ID.");
  let fehler = "";
  try {
    const { data, error } = await createAdminClient().auth.admin.getUserById(uid);
    // entfernenErlaubt schlägt bei fehlender E-Mail fehl (fail closed)
    fehler = entfernenErlaubt({ zielId: uid, zielEmail: error ? null : data.user?.email, eigeneId: n.id, adminEnv: process.env.ADMIN_EMAIL }) ?? "";
    if (!fehler) await loescheNutzer(uid);
  } catch (e) {
    console.error("nutzerEntfernen", e);
    fehler = "Entfernen fehlgeschlagen. Bitte später erneut versuchen.";
  }
  if (fehler) zurueck(fehler);
  redirect("/admin/nutzer");
}
