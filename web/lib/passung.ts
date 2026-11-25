import type { SupabaseClient } from "@supabase/supabase-js";
import einwilligungen from "./cv-einwilligung.json" with { type: "json" };

// "Passung" gibt es nur für Konten, für die gerechnet wird: Admin, Admin-Einwilligung der aktuellen Fassung, mindestens ein CV.
// Fehler (z. B. fehlende Tabelle) heißen "nicht verfügbar", nie ein Absturz der Liste.
export async function passungVerfuegbar(sb: SupabaseClient, nutzer: { admin: boolean } | null): Promise<boolean> {
  if (!nutzer?.admin) return false;
  const einw = await sb.from("cv_einwilligung").select("fassung").maybeSingle();
  if (einw.error || einw.data?.fassung !== einwilligungen.admin.fassung) return false;
  const cv = await sb.from("documents").select("id").eq("art", "cv").limit(1);
  return !cv.error && (cv.data?.length ?? 0) > 0;
}
