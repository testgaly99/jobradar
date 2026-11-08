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
    const { data } = await createAdminClient().auth.admin.getUserById(uid);
    fehler = entfernenErlaubt({ zielId: uid, zielEmail: data.user?.email, eigeneId: n.id, adminEnv: process.env.ADMIN_EMAIL }) ?? "";
    if (!fehler) await loescheNutzer(uid);
  } catch (e) {
    fehler = e instanceof Error ? e.message : "Der Nutzer konnte nicht entfernt werden.";
  }
  if (fehler) zurueck(fehler);
  redirect("/admin/nutzer");
}
