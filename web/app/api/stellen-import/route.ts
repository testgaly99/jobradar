import { createClient } from "@/lib/supabase/server";
import { bearbeiteImportAnfrage } from "@/lib/stellen-import";

export async function POST(request: Request) {
  return bearbeiteImportAnfrage(request, createClient);
}
