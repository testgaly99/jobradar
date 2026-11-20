// Schritt-Anleitung zum Einrichten der Chrome-Erweiterung je Browser (Konto-Seite, Q63).
export type Browser = "chrome" | "edge" | "mobil";

// Nur Chrome und Edge können die Erweiterung laden; Handy, Firefox und Safari bekommen den Hinweis.
export function browserAus(ua: string | null): Browser {
  if (!ua) return "chrome";
  if (/Mobi|Android|iPhone|iPad/i.test(ua)) return "mobil";
  if (ua.includes("Edg/")) return "edge";
  if (ua.includes("Chrome/")) return "chrome";
  return "mobil";
}

export function anleitung(b: Browser): string[] {
  if (b === "mobil") return ["Nur am Computer mit Chrome oder Edge."];
  return [
    `${b}://extensions in die Adresszeile eintippen und Enter drücken.`,
    `${b === "edge" ? "Links unten" : "Oben rechts"} den Schalter „Entwicklermodus“ einschalten.`,
    "Die heruntergeladene ZIP-Datei entpacken: Rechtsklick → „Alle extrahieren…“.",
    "Auf „Entpackte Erweiterung laden“ klicken und den Ordner „jobradar-erweiterung“ wählen.",
    "Bei „Jobradar – Anzeige merken“ auf „Details“ → „Erweiterungsoptionen“ klicken.",
    "Deine Jobradar-Adresse (unten kopieren) einfügen und „Verbinden“ klicken; die Nachfrage des Browsers erlauben.",
    "Oben rechts im Puzzle-Symbol den Jobradar-Knopf anheften.",
  ];
}

export function aktualisieren(b: Browser): string[] {
  if (b === "mobil") return [];
  return [
    "Die neue ZIP-Datei herunterladen und entpacken.",
    "Den alten Ordner „jobradar-erweiterung“ durch den neuen ersetzen (gleicher Ort).",
    `In ${b}://extensions bei „Jobradar – Anzeige merken“ auf ↻ (Neu laden) klicken.`,
  ];
}
