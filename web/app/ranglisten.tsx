import { rankingQuellUrl, type RankingZuordnung } from "@/lib/rankings";

// Nur mit den bereits für angemeldete Nutzer geladenen Zuordnungen aufrufen.
export default function Ranglisten({ zuordnungen }: { zuordnungen: RankingZuordnung[] }) {
  if (!zuordnungen.length) return null;
  return (
    <ul className="ranglisten klein" aria-label="Ranglisten">
      {zuordnungen.map((z) => {
        const url = rankingQuellUrl(z.quelle_url);
        const text = `${z.name} ${z.jahr}${z.rang === null ? "" : `: Platz ${z.rang}`}`;
        return (
          <li key={z.liste_id}>
            {url ? <a href={url} target="_blank" rel="noopener noreferrer">{text}</a> : text}
            <span className="gedaempft"> · {z.lizenz}</span>
          </li>
        );
      })}
    </ul>
  );
}
