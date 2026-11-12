// Welche Seiten ohne Anmeldung erreichbar sind (Spec "Öffentlicher Zugang"). Vergleich nach erstem Pfadsegment,
// damit z. B. "/stellenx" nicht als "/stellen" durchgeht.
const OFFEN = new Set(["", "stellen", "impressum", "datenschutz", "login", "auth"]);

export const istOeffentlich = (pfad: string) => OFFEN.has(pfad.split("/")[1] ?? "");

// Suchmaschinen sollen die Seite nicht aufnehmen: als Meta-Tag (layout.tsx) und als Header (next.config.ts).
export const ROBOTS = "noindex, nofollow, noarchive";
