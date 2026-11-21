"use client";
import { useActionState } from "react";
import { firmaBeobachten, keinOriginal, originalWaehlen } from "@/app/bewerbungen/actions";
import { SendeKnopf } from "@/app/bewerbungen/knoepfe";

export default function OriginalKnopf({ appId, wahl, text }: { appId: string; wahl: number | "keine" | "beobachten"; text: string }) {
  const [fehler, senden] = useActionState(async () => {
    const r = await (wahl === "keine" ? keinOriginal(appId) : wahl === "beobachten" ? firmaBeobachten(appId) : originalWaehlen(appId, wahl));
    return r.fehler;
  }, null as string | null);
  return (
    <form action={senden} className="kein-druck">
      <SendeKnopf text={text} klasse="knopf knopf-rand knopf-schmal" />
      {fehler && <p className="meldung fehler" role="alert">{fehler}</p>}
    </form>
  );
}
