import Link from "next/link";

type SP = Record<string, string | string[] | undefined>;
const LINKS = [["tabelle", "/bewerbungen", "Manuell anlegen"], ["kanban", "/bewerbungen/kanban", "Kanban"], ["auswertung", "/bewerbungen/auswertung", "Auswertung"]] as const;

// Tabelle und Kanban teilen Filter und Archiv-Schalter: beim Wechsel bleiben die Suchparameter erhalten.
export default function UnterNav({ aktiv, sp }: { aktiv: string; sp?: SP }) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp ?? {})) [v ?? []].flat().forEach((w) => p.append(k, w));
  const q = p.toString();
  return (
    <nav className="unternav" aria-label="Ansicht">
      {LINKS.map(([k, href, name]) => (
        <Link key={k} href={q && (k === "tabelle" || k === "kanban") ? `${href}?${q}` : href} aria-current={aktiv === k ? "page" : undefined}>{name}</Link>
      ))}
    </nav>
  );
}
