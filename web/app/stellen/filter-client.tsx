"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

// Umschließt das serverseitig gerenderte Filterformular: Änderungen an Häkchen/Auswahl und Enter/"Suchen" navigieren
// per router.replace ohne Seiten-Neuladen. Ohne JavaScript bleibt es ein normales GET-Formular.
export default function FilterClient({ aktion, listeId, children }: { aktion: string; listeId: string; children: React.ReactNode }) {
  const router = useRouter();
  const [laedt, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const liste = document.getElementById(listeId);
    if (!liste) return;
    if (laedt) liste.setAttribute("aria-busy", "true"); else liste.removeAttribute("aria-busy");
  }, [laedt, listeId]);

  function los(seiteZuruecksetzen: boolean) {
    const u = new URLSearchParams();
    for (const [k, v] of new FormData(form.current!)) if (typeof v === "string" && v.trim() !== "") u.append(k, v.trim());
    if (seiteZuruecksetzen) u.delete("seite");
    const s = u.toString();
    start(() => router.replace(s ? `${aktion}?${s}` : aktion, { scroll: false }));
  }

  return (
    <form ref={form} method="get" action={aktion} className="filterform"
      onChange={(e) => { if ((e.target as HTMLElement).getAttribute("type") !== "search") los(true); }}
      onSubmit={(e) => { e.preventDefault(); los(true); }}>
      {children}
    </form>
  );
}
