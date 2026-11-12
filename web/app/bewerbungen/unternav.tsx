import Link from "next/link";

type SP = Record<string, string | string[] | undefined>;
const LINKS = [["meine", "/bewerbungen", "Meine Bewerbungen"], ["neu", "/bewerbungen/neu", "+ Bewerbung hinzufügen"], ["auswertung", "/bewerbungen/auswertung", "Auswertung"]] as const;

// Zurück zu "Meine Bewerbungen" behält Filter, Archiv-Schalter und Auswahl.
export default function UnterNav({ aktiv, sp }: { aktiv: string; sp?: SP }) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp ?? {})) [v ?? []].flat().forEach((w) => p.append(k, w));
  const q = p.toString();
  return (
    <nav className="unternav" aria-label="Ansicht">
      {LINKS.map(([k, href, name]) => (
        <Link key={k} href={q && k === "meine" ? `${href}?${q}` : href} aria-current={aktiv === k ? "page" : undefined}>{name}</Link>
      ))}
    </nav>
  );
}
