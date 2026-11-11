"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { formZuUrl } from "@/lib/filter";

// Umschließt das serverseitig gerenderte Filterformular: Änderungen an Häkchen/Auswahl und Enter/"Suchen" navigieren
// per router.replace ohne Seiten-Neuladen. Ohne JavaScript bleibt es ein normales GET-Formular.
export default function FilterClient({ aktion, listeId, children }: { aktion: string; listeId: string; children: React.ReactNode }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [laedt, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const liste = document.getElementById(listeId);
    if (!liste) return;
    if (laedt) liste.setAttribute("aria-busy", "true"); else liste.removeAttribute("aria-busy");
  }, [laedt, listeId]);

  function los(mitSuche: boolean) {
    const u = formZuUrl(aktion, new URLSearchParams(new FormData(form.current!) as unknown as Record<string, string>), new URLSearchParams(sp.toString()), mitSuche);
    start(() => router.replace(u, { scroll: false }));
  }

  // key = aktuelle Adresse: bei Zurücksetzen, Zurück/Vor wird das Formular neu aufgebaut und zeigt wieder den Stand der Adresse.
  return (
    <form key={sp.toString()} ref={form} method="get" action={aktion} className="filterform"
      onChange={(e) => { const t = e.target as unknown as HTMLInputElement; if (t.type !== "search" && t.name !== "volltext") los(false); }}
      onSubmit={(e) => { e.preventDefault(); los(true); }}>
      {children}
    </form>
  );
}
