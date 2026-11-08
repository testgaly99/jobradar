import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ERLAUBT = ["/", "/auth/neues-passwort"]; // exakte Liste, kein offener Redirect

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${ERLAUBT.includes(next) ? next : "/"}`);
  }
  return NextResponse.redirect(`${origin}/login`);
}
