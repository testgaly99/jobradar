import { createClient } from "@/lib/supabase/server";
import { bewerbungenCsv } from "@/lib/export";

export async function GET() {
  const sb = await createClient();
  const { data: c } = await sb.auth.getClaims();
  if (!c?.claims) return new Response("Nicht angemeldet", { status: 401 });

  // PostgREST kappt bei 1000 Zeilen: seitenweise holen, stabil nach id sortiert.
  const alle = async (tabelle: string, spalten: string) => {
    const zeilen: Record<string, unknown>[] = [];
    for (let von = 0; ; von += 1000) {
      const { data, error } = await sb.from(tabelle).select(spalten).order("id").range(von, von + 999);
      if (error) throw error;
      zeilen.push(...(data as unknown as Record<string, unknown>[]));
      if (data.length < 1000) return zeilen;
    }
  };
  try {
    const csv = bewerbungenCsv(
      await alle("applications", "*"),
      await alle("contacts", "application_id,name,rolle,email,telefon"),
      await alle("interviews", "application_id,datum,format,teilnehmer"),
      await alle("documents", "id,name"),
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="jobradar-bewerbungen-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return new Response("Export fehlgeschlagen", { status: 500 });
  }
}
