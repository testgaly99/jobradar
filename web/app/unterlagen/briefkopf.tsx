"use client";
import { useActionState } from "react";
import type { Briefkopf } from "@/lib/brief-datei";
import { SendeKnopf } from "../bewerbungen/knoepfe";
import { briefkopfSpeichern } from "./actions";

const FELDER: [keyof Briefkopf, string, string][] = [
  ["name", "Name", "text"], ["strasse", "Straße und Hausnummer", "text"], ["plz_ort", "PLZ und Ort", "text"],
  ["telefon", "Telefon", "tel"], ["email", "E-Mail", "email"], ["linkedin", "LinkedIn (optional)", "url"],
];

export function BriefkopfFormular({ kopf }: { kopf: Briefkopf | null }) {
  const [zustand, aktion] = useActionState<{ fehler?: string; ok?: boolean } | null, FormData>(async (_, f) => {
    const r = await briefkopfSpeichern(f);
    return r.fehler ? r : { ok: true };
  }, null);
  return (
    <form action={aktion} className="formular">
      {FELDER.map(([k, titel, typ]) => (
        <label key={k}>{titel}
          <input name={k} type={typ} defaultValue={kopf?.[k] ?? ""} required={k === "name"} maxLength={200} />
        </label>
      ))}
      {zustand?.fehler && <p className="meldung fehler" role="alert">{zustand.fehler}</p>}
      {zustand?.ok && <p className="meldung" role="status">Gespeichert.</p>}
      <SendeKnopf text="Briefkopf speichern" warte="Speichere …" />
    </form>
  );
}
