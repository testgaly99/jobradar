"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Seitenfenster rechts: modaler <dialog> (Fokus bleibt drin, Hintergrund abgedunkelt); Esc, "Schließen" und Klick daneben ⇒ zurück.
export default function Fenster({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const d = ref.current;
    if (d && !d.open) d.showModal();
    d?.querySelector<HTMLElement>(".fenster-zu")?.focus();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, []);
  return (
    <dialog
      ref={ref}
      className="fenster"
      aria-label="Bewerbung"
      onCancel={(e) => { e.preventDefault(); router.back(); }}
      onClick={(e) => { if (e.target === e.currentTarget) router.back(); }}
    >
      <div className="fenster-innen">
        <button type="button" className="knopf knopf-leise knopf-schmal fenster-zu" onClick={() => router.back()}>Schließen</button>
        {children}
      </div>
    </dialog>
  );
}
