import "server-only";
import { createClient } from "@/lib/supabase/server";
import { istAdmin } from "@/lib/admin";

export async function aktuellerNutzer(): Promise<{ id: string; email: string | null; admin: boolean } | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub) return null;
  const email = typeof c.email === "string" ? c.email : null;
  return { id: c.sub, email, admin: istAdmin(email, process.env.ADMIN_EMAIL) };
}
