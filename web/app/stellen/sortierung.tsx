"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { filterZuUrl, type Filter, type Sortierung } from "@/lib/filter";

const TEXT: Record<Sortierung, string> = {
  passung: "Passung", neu: "Online seit (neueste zuerst)", firma: "Firma A bis Z", titel: "Titel A bis Z",
  groesse: "Größe", rangliste: "Nach Rangliste",
};

// Sichtbare Sortierung über der Liste; die Wahl wird ein Jahr als Cookie gemerkt (Server liest sie nur ohne sort in der Adresse).
export default function Sortierung({ filter, optionen }: { filter: Filter; optionen: Sortierung[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  function wechseln(sort: Sortierung) {
    document.cookie = `stellen_sort=${encodeURIComponent(JSON.stringify({ sort, kat: filter.ansicht_kategorie }))}; path=/; max-age=31536000; samesite=lax`;
    // "neu" lässt filterZuUrl weg: ohne sort-Parameter würde das Cookie gelten, also hier ausdrücklich setzen
    const u = filterZuUrl({ ...filter, sort, seite: 1 });
    start(() => router.push(sort === "neu" ? u + (u.includes("?") ? "&" : "?") + "sort=neu" : u));
  }
  return (
    <div className="sortierleiste">
      <label>Sortieren nach
        <select value={filter.sort} onChange={(e) => wechseln(e.target.value as Sortierung)}>
          {optionen.map((o) => <option key={o} value={o}>{TEXT[o]}</option>)}
        </select>
      </label>
    </div>
  );
}
