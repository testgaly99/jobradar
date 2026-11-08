import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function abmelden() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function Kopf() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null; // Login-Seiten haben keine Navigation
  return (
    <header className="kopf">
      <Link href="/stellen" className="logo">Jobradar</Link>
      <nav aria-label="Hauptmenü" className="nav">
        <Link href="/stellen">Stellen</Link>
        <Link href="/bewerbungen">Bewerbungen</Link>
        <Link href="/dokumente">Dokumente</Link>
        <form action={abmelden}><button className="knopf knopf-leise" type="submit">Abmelden</button></form>
      </nav>
    </header>
  );
}
