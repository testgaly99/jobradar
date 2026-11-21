import { createClient } from "@/lib/supabase/server";
import { bearbeiteImportAnfrage } from "@/lib/stellen-import";
import { after } from "next/server";

export async function POST(request: Request) {
  return bearbeiteImportAnfrage(request, createClient, after);
}
