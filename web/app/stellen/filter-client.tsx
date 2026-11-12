"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { formZuUrl } from "@/lib/filter";

// Umschließt das serverseitig gerenderte Filterformular: Änderungen an Häkchen/Auswahl und Enter/"Suchen" navigieren
// per router.replace ohne Seiten-Neuladen. Ohne JavaScript bleibt es ein normales GET-Formular.
export default function FilterClient({ aktion, listeId, textFelder = ["q", "ohne", "volltext"], children }: { aktion: string; listeId: string; textFelder?: string[]; children: React.ReactNode }) {
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
    const u = formZuUrl(aktion, new URLSearchParams(new FormData(form.current!) as unknown as Record<string, string>), new URLSearchParams(sp.toString()), mitSuche, textFelder);
    start(() => router.replace(u, { scroll: false }));
  }

  // Neue Adresse (Filter, Zurücksetzen, Zurück/Vor): Felder auf den Stand der Adresse zurücksetzen, ohne Neuaufbau,
  // damit Tastaturfokus und geöffnete Gruppen bleiben. React hat defaultValue/defaultChecked da schon aktualisiert.
  const adresse = sp.toString();
  useEffect(() => { form.current?.reset(); }, [adresse]);

  return (
    <form ref={form} method="get" action={aktion} className="filterform"
      onChange={(e) => { const t = e.target as unknown as HTMLInputElement; if (t.type !== "search" && !textFelder.includes(t.name)) los(false); }}
      onSubmit={(e) => { e.preventDefault(); los(true); }}>
      {children}
    </form>
  );
}
