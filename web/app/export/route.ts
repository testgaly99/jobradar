import { createClient } from "@/lib/supabase/server";
import { bewerbungenCsv } from "@/lib/export";

export async function GET() {
  const sb = await createClient();
  const { data: c } = await sb.auth.getClaims();
  if (!c?.claims) return new Response("Nicht angemeldet", { status: 401 });

  // PostgREST kappt bei 1000 Zeilen: seitenweise holen, stabil nach id sortiert.
  const alle = async (tabelle: string, spalten: string, ordnung = ["id"]) => {
    const zeilen: Record<string, unknown>[] = [];
    for (let von = 0; ; von += 1000) {
      let q = sb.from(tabelle).select(spalten);
      for (const o of ordnung) q = q.order(o);
      const { data, error } = await q.range(von, von + 999);
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
      // Bis Migration 023 fehlt die Tabelle: Export ohne Anlagen statt ohne alles.
      await alle("bewerbung_anlagen", "application_id,document_id", ["application_id", "document_id"]).catch((e) => {
        if (["42P01", "PGRST205"].includes(e?.code)) return [];
        throw e;
      }),
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
