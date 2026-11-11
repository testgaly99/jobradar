"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Seitenfenster rechts: modaler <dialog> (Fokus bleibt drin, Hintergrund abgedunkelt); Esc, "Schließen" und Klick daneben ⇒ zurück.
export default function Fenster({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const amRand = useRef(false); // nur schließen, wenn der Klick auch auf dem Rand begann (Text markieren und daneben loslassen schließt nicht)
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
      aria-labelledby="bewerbung-titel"
      onCancel={(e) => { e.preventDefault(); router.back(); }}
      onPointerDown={(e) => { amRand.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (amRand.current && e.target === e.currentTarget) router.back(); amRand.current = false; }}
    >
      <div className="fenster-innen">
        <button type="button" className="knopf knopf-leise knopf-schmal fenster-zu" onClick={() => router.back()}>Schließen</button>
        {children}
      </div>
    </dialog>
  );
}
