"use server";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { whitelistEingabe } from "@/lib/whitelist";
import { revalidatePath } from "next/cache";
import { istUuid } from "@/lib/bewerbung";
import { createClient } from "@/lib/supabase/server";
import { aktuellerNutzer } from "@/lib/nutzer";
import { bestaetigt } from "@/lib/bestaetigung";
import { selbstLoeschenErlaubt, begriffPruefen } from "@/lib/nutzerliste";
import { FELDER } from "@/lib/steckbrief";
import { spracheEingabe } from "@/lib/sprachniveau";
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
  if (error?.message.includes("wichtige_punkte_limit")) zurueck(`Du kannst höchstens ${MAX_BEGRIFFE} Begriffe speichern.`);
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

export async function felderSpeichern(formData: FormData) {
  const n = await aktuellerNutzer();
  if (!n) redirect("/login");
  // Nur erlaubte Namen, in fester Reihenfolge; alles andere aus dem Formular wird verworfen.
  const gewaehlt = formData.getAll("felder").map(String);
  const felder = FELDER.filter((f) => gewaehlt.includes(f));
  const { error } = await (await createClient()).from("listen_felder").upsert({ owner_id: n.id, felder }, { onConflict: "owner_id" });
  if (error) zurueck(["42P01", "PGRST205"].includes(error.code ?? "") ? "Die Kurzbeschreibung ist erst nach Migration 005 einstellbar." : "Speichern fehlgeschlagen. Bitte später erneut versuchen.");
  revalidatePath("/stellen");
  revalidatePath("/konto");
}

// Spracheinstellung: Sprachzeile in "Das bringst du mit" und gespeichertes Deutschniveau für den Stellenfilter (Migration 013).
export async function spracheSpeichern(formData: FormData) {
  const n = await aktuellerNutzer();
  if (!n) redirect("/login");
  const e = spracheEingabe(formData.get("zeigen"), formData.get("niveau"));
  if (!e) zurueck("Ungültiges Deutschniveau.");
  const { error } = await (await createClient()).from("sprach_einstellung").upsert({ owner_id: n.id, ...e }, { onConflict: "owner_id" });
  if (error) zurueck(["42P01", "PGRST205"].includes(error.code ?? "") ? "Die Spracheinstellung geht erst nach Migration 013." : "Speichern fehlgeschlagen. Bitte später erneut versuchen.");
  revalidatePath("/stellen");
  revalidatePath("/konto");
}

// Nur Admin: Firma auf die Whitelist setzen oder entfernen; wirkt sofort auf die "nein"-Stellen der Firma (Migration 011).
export async function whitelistSetzen(formData: FormData) {
  const n = await aktuellerNutzer();
  if (!n?.admin) notFound();
  const e = whitelistEingabe(formData.get("firma"), formData.get("wert"));
  if (!e) zurueck("Ungültige Eingabe.");
  const { error } = await createAdminClient().rpc("whitelist_setzen", { p_firma: e.firma, p_wert: e.wert });
  if (error?.code === "PGRST202") zurueck("Migration 011 fehlt: bitte im Supabase SQL Editor einspielen.");
  if (error) {
    console.error("whitelistSetzen:", error.code);
    zurueck("Speichern fehlgeschlagen.");
  }
  revalidatePath("/konto");
  redirect("/konto#whitelist");
}
