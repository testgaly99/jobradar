import { redirect, RedirectType } from "next/navigation";

type SP = Record<string, string | string[] | undefined>;

// Früherer Reiter "Kanban": das Board steht jetzt oben auf "Meine Bewerbungen"; alte Links und Filter bleiben gültig.
export default async function Seite({ searchParams }: { searchParams: Promise<SP> }) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) if (v !== undefined) [v].flat().forEach((w) => p.append(k, w));
  const q = p.toString();
  redirect(q ? `/bewerbungen?${q}` : "/bewerbungen", RedirectType.replace);
}
