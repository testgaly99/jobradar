import Link from "next/link";

const LINKS = [["tabelle", "/bewerbungen", "Tabelle"], ["kanban", "/bewerbungen/kanban", "Kanban"], ["neu", "/bewerbungen/neu", "Manuell anlegen"]] as const;

export default function UnterNav({ aktiv }: { aktiv: string }) {
  return (
    <nav className="unternav" aria-label="Ansicht">
      {LINKS.map(([k, href, name]) => (
        <Link key={k} href={href} aria-current={aktiv === k ? "page" : undefined}>{name}</Link>
      ))}
    </nav>
  );
}
