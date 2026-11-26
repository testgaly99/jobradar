"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { filterZuUrl, type Filter, type Sortierung } from "@/lib/filter";
import type { RankingListe } from "@/lib/rankings";

const TEXT: Record<Sortierung, string> = { passung: "Empfohlen", neu: "Online seit", groesse: "Größe", rangliste: "Nach Rangliste" };
// Titel des Richtungsknopfs: Standardrichtung ("ab") zuerst, umgekehrt ("auf") danach.
const RICHTUNG: Record<Sortierung, [string, string]> = {
  passung: ["Beste zuerst", "Schwächste zuerst"], neu: ["Neueste zuerst", "Älteste zuerst"],
  groesse: ["Größte zuerst", "Kleinste zuerst"], rangliste: ["Platz 1 zuerst", "Letzter Platz zuerst"],
};
const EINTRAG = '[role="menuitem"]';

// Sichtbare Sortierung über der Liste (eigenes Menü, damit "Nach Rangliste" ein Untermenü haben kann).
// Die Wahl wird ein Jahr als Cookie gemerkt (Server liest sie nur ohne gültiges sort in der Adresse).
export default function Sortierung({ filter, optionen, listen }: { filter: Filter; optionen: Sortierung[]; listen: RankingListe[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [offen, setOffen] = useState(false);
  const [sub, setSub] = useState(false);
  const wurzel = useRef<HTMLDivElement>(null);
  const knopf = useRef<HTMLButtonElement>(null);
  const rangEintrag = useRef<HTMLButtonElement>(null);
  // Zuletzt Maus/Touch? Dann bekommt programmatischer Fokus keinen Ring (Tastatur: Ring bleibt).
  const zeiger = useRef(false);
  const fokus = (el?: HTMLElement | null) => el?.focus(zeiger.current ? ({ focusVisible: false } as FocusOptions) : undefined);

  useEffect(() => {
    if (!offen) return;
    const aus = (e: PointerEvent) => { if (!wurzel.current?.contains(e.target as Node)) { setOffen(false); setSub(false); } };
    document.addEventListener("pointerdown", aus);
    return () => document.removeEventListener("pointerdown", aus);
  }, [offen]);

  // Beim Öffnen springt der Fokus auf den aktuellen (sonst ersten) Eintrag.
  useEffect(() => {
    if (!offen) return;
    const liste = eintraege(wurzel.current?.querySelector<HTMLElement>(".sortliste:not(.subliste)") ?? null);
    fokus(liste.find((e) => e.getAttribute("aria-current") === "true") ?? liste[0]);
  }, [offen]);

  function wechseln(neu: { sort?: Sortierung; richtung?: Filter["richtung"]; rangliste?: string }) {
    const f = { ...filter, ...neu, seite: 1 };
    document.cookie = `stellen_sort=${encodeURIComponent(JSON.stringify({ sort: f.sort, dir: f.richtung, rl: f.rangliste }))}; path=/; max-age=31536000; samesite=lax`;
    // "neu" lässt filterZuUrl weg: ohne sort-Parameter würde das Cookie gelten, also hier ausdrücklich setzen
    const u = filterZuUrl(f);
    // Das Menü verschwindet: Fokus zurück auf den Knopf, sonst geht er verloren.
    if (offen) fokus(knopf.current);
    setOffen(false); setSub(false);
    start(() => router.push(f.sort === "neu" ? u + (u.includes("?") ? "&" : "?") + "sort=neu" : u));
  }

  const ebene = (el: Element | null) => el?.closest<HTMLElement>('[role="menu"]') ?? null;
  const eintraege = (m: HTMLElement | null) => [...(m?.querySelectorAll<HTMLElement>(EINTRAG) ?? [])].filter((e) => ebene(e) === m);
  function tasten(e: KeyboardEvent<HTMLDivElement>) {
    zeiger.current = false;
    if (e.target === knopf.current) { if (e.key === "Escape" && offen) { e.preventDefault(); setOffen(false); setSub(false); } return; }
    const m = ebene(e.target as Element);
    if (!m) return;
    const liste = eintraege(m);
    const i = liste.indexOf(e.target as HTMLElement);
    const geh = (n: number) => { e.preventDefault(); fokus(liste[(n + liste.length) % liste.length]); };
    if (e.key === "ArrowDown") geh(i + 1);
    else if (e.key === "ArrowUp") geh(i - 1);
    else if (e.key === "Home") geh(0);
    else if (e.key === "End") geh(liste.length - 1);
    else if (e.key === "ArrowRight" && e.target === rangEintrag.current) { e.preventDefault(); setSub(true); requestAnimationFrame(() => fokus(eintraege(wurzel.current?.querySelector<HTMLElement>("[data-sub]") ?? null)[0])); }
    else if ((e.key === "Escape" || e.key === "ArrowLeft") && m.hasAttribute("data-sub")) { e.preventDefault(); setSub(false); fokus(rangEintrag.current); }
    else if (e.key === "Escape") { e.preventDefault(); setOffen(false); setSub(false); fokus(knopf.current); }
    else if (e.key === "Tab") { setOffen(false); setSub(false); }
  }

  const aktuell = TEXT[filter.sort];
  return (
    <div className="sortierleiste">
      <div className="sortmenue" ref={wurzel} onKeyDown={tasten} onPointerDownCapture={() => { zeiger.current = true; }}>
        <button type="button" ref={knopf} className="sortknopf" aria-haspopup="menu" aria-expanded={offen}
          onClick={() => { setOffen(!offen); setSub(false); }}
          onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setOffen(true); } }}>
          Sortieren nach: <strong>{aktuell}</strong> <span aria-hidden="true">▾</span>
        </button>
        {offen && (
          <div role="menu" aria-label="Sortieren nach" className="sortliste">
            {optionen.filter((o) => o !== "rangliste").map((o) => (
              <button key={o} type="button" role="menuitem" aria-current={filter.sort === o} onClick={() => wechseln({ sort: o })}>{TEXT[o]}</button>
            ))}
            {optionen.includes("rangliste") && (
              <div className="subwurzel" onPointerEnter={(e) => { if (e.pointerType === "mouse") setSub(true); }} onPointerLeave={(e) => { if (e.pointerType === "mouse") setSub(false); }}>
                <button type="button" role="menuitem" ref={rangEintrag} aria-haspopup="menu" aria-expanded={sub} aria-current={filter.sort === "rangliste"}
                  onClick={() => setSub(!sub)}>Nach Rangliste ▸</button>
                {sub && (
                  <div role="menu" data-sub="" aria-label="Rangliste" className="sortliste subliste">
                    <button type="button" role="menuitem" aria-current={filter.sort === "rangliste" && filter.rangliste === "alle"} onClick={() => wechseln({ sort: "rangliste", rangliste: "alle" })}>Alle Ranglisten</button>
                    {listen.map((l) => (
                      <button key={l.id} type="button" role="menuitem" aria-current={filter.sort === "rangliste" && filter.rangliste === l.id} onClick={() => wechseln({ sort: "rangliste", rangliste: l.id })}>{l.name}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <button type="button" className="sortrichtung" aria-label="Richtung umkehren" title={`${RICHTUNG[filter.sort][filter.richtung === "auf" ? 1 : 0]}. Richtung umkehren`}
        onClick={() => wechseln({ richtung: filter.richtung === "auf" ? "ab" : "auf" })}>{filter.richtung === "auf" ? "↑" : "↓"}</button>
    </div>
  );
}
