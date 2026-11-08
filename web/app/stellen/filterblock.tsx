"use client";
import { useEffect, useRef } from "react";

// Am Laptop offen, auf dem Handy eingeklappt.
export default function FilterBlock({ titel, children }: { titel: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (window.matchMedia("(min-width: 900px)").matches && ref.current) ref.current.open = true;
  }, []);
  return (
    <details ref={ref} className="filterblock">
      <summary>{titel}</summary>
      {children}
    </details>
  );
}
