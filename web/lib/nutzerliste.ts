import { istAdmin } from "./admin.ts";

type U = { id: string; email?: string; created_at: string; user_metadata?: { full_name?: string; name?: string } };

const datum = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" });

export function nutzerZeilen(users: U[]) {
  return [...users]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((u) => ({
      id: u.id,
      name: u.user_metadata?.full_name || u.user_metadata?.name || "–",
      email: u.email ?? "",
      dabeiSeit: datum.format(new Date(u.created_at)),
    }));
}

export function selbstLoeschenErlaubt(p: { istAdmin: boolean; adminEnv?: string }): string | null {
  if (!p.adminEnv?.trim()) return "Konto löschen ist gerade nicht möglich. Bitte den Betreiber kontaktieren.";
  return p.istAdmin ? "Das Admin-Konto kann nicht gelöscht werden." : null;
}

export function entfernenErlaubt(p: { zielId: string; zielEmail?: string | null; eigeneId: string; adminEnv?: string }): string | null {
  if (!p.zielEmail) return "Nutzer konnte nicht geprüft werden. Es wurde nichts gelöscht."; // fail closed
  return p.zielId === p.eigeneId || istAdmin(p.zielEmail, p.adminEnv) ? "Das Admin-Konto kann nicht gelöscht werden." : null;
}
