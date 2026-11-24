import { createClient } from "@/lib/supabase/server";

// Eigene CV-Daten als JSON (Phase 6a); RLS liefert nur Zeilen des angemeldeten Kontos.
export async function GET() {
  const sb = await createClient();
  const { data: c } = await sb.auth.getClaims();
  if (!c?.claims) return new Response("Nicht angemeldet", { status: 401 });
  const tabellen = ["cv_texte", "cv_profile", "cv_ergebnisse", "cv_einwilligung"] as const;
  const antworten = await Promise.all(tabellen.map((t) => sb.from(t).select("*")));
  if (antworten.some((a) => a.error)) return new Response("Export fehlgeschlagen", { status: 500 });
  const daten = Object.fromEntries(tabellen.map((t, i) => [t, antworten[i].data]));
  return new Response(JSON.stringify(daten, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="jobradar-cv-daten-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
