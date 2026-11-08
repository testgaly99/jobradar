import { createClient } from "@/lib/supabase/server";
import { csvDatei } from "@/lib/export";
import { zip } from "@/lib/zip";

const TABELLEN = [
  ["bewerbungen", "applications"],
  ["kontakte", "contacts"],
  ["interviews", "interviews"],
  ["verlauf", "application_events"],
] as const;

export async function GET() {
  const sb = await createClient();
  const { data: c } = await sb.auth.getClaims();
  if (!c?.claims) return new Response("Nicht angemeldet", { status: 401 });

  const dateien = [];
  for (const [datei, tabelle] of TABELLEN) {
    const zeilen: Record<string, unknown>[] = [];
    // PostgREST kappt bei 1000 Zeilen: seitenweise holen, stabil nach id sortiert.
    for (let von = 0; ; von += 1000) {
      const { data, error } = await sb.from(tabelle).select("*").order("id").range(von, von + 999);
      if (error) return new Response("Export fehlgeschlagen", { status: 500 });
      zeilen.push(...data);
      if (data.length < 1000) break;
    }
    const spalten = [...new Set(zeilen.flatMap((z) => Object.keys(z)))];
    dateien.push({ name: `${datei}.csv`, data: csvDatei(spalten, zeilen) });
  }
  return new Response(new Uint8Array(zip(dateien)), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="jobradar-export-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
