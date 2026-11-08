// CSV für Excel (Deutschland): UTF-8 mit BOM, Trennzeichen ";", CRLF.
export function csvFeld(wert: unknown): string {
  let s = wert == null ? "" : Array.isArray(wert) ? wert.join(", ") : String(wert);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // CSV-Injection: Excel würde sonst eine Formel ausführen
  return /[;"\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function csvDatei(spalten: string[], zeilen: Record<string, unknown>[]): string {
  const zeile = (f: unknown[]) => f.map(csvFeld).join(";") + "\r\n";
  return "\uFEFF" + zeile(spalten) + zeilen.map((z) => zeile(spalten.map((s) => z[s]))).join("");
}

// Speicherpfad-tauglicher Dateiname: nur [A-Za-z0-9._-], höchstens 100 Zeichen.
export function dateiname(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100) || "datei";
}
