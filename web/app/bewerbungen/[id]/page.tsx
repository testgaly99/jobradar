import { redirect, RedirectType } from "next/navigation";

// Alte Adresse /bewerbungen/<id> (Lesezeichen) führt zur neuen /bewerbung/<id>.
export default async function AlteAdresse({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fehler?: string }> }) {
  const [{ id }, { fehler }] = await Promise.all([params, searchParams]);
  redirect(`/bewerbung/${encodeURIComponent(id)}${fehler ? `?fehler=${encodeURIComponent(fehler)}` : ""}`, RedirectType.replace);
}
