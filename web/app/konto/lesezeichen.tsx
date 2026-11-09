"use client";
import { useEffect, useRef } from "react";

// React sperrt javascript:-Adressen im href, darum setzen wir sie nach dem Laden direkt am Element.
export function Lesezeichen({ href }: { href: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => { ref.current?.setAttribute("href", href); }, [href]);
  return (
    <a ref={ref} className="knopf knopf-rand knopf-schmal" draggable
      onClick={(e) => { e.preventDefault(); alert("Nicht hier klicken: Zieh den Knopf in deine Lesezeichenleiste."); }}>
      Zu Jobradar
    </a>
  );
}
