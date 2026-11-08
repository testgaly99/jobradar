// CSV für Excel (Deutschland): UTF-8 mit BOM, Trennzeichen ";", CRLF.
export function csvFeld(wert: unknown): string {
  let s = wert == null ? "" : Array.isArray(wert) ? wert.join(", ") : typeof wert === "object" ? JSON.stringify(wert) : String(wert);
  // CSV-Injection: Excel würde sonst eine Formel ausführen. Nur Texte; Zahlen wie -1 bleiben.
  if (typeof wert === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[;"\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function csvDatei(spalten: string[], zeilen: Record<string, unknown>[]): string {
  const zeile = (f: unknown[]) => f.map(csvFeld).join(";") + "\r\n";
  return "\uFEFF" + zeile(spalten) + zeilen.map((z) => zeile(spalten.map((s) => z[s]))).join("");
}

// Feste Spalten je Tabelle (aus 001_schema.sql), damit auch leere Tabellen eine Kopfzeile haben.
export const SPALTEN: Record<string, string[]> = {
  applications: "id owner_id job_id firma titel link quelle standort praesenzmodell snapshot_text anforderungen beworben_am bewerbungsweg referenznummer portal_hinweis cv_dokument_id anschreiben_dokument_id gehalt_spanne_anzeige gehalt_wunsch angebot_fix angebot_variabel angebot_urlaub angebot_benefits gehalt_aktuell_vergleich starttermin kuendigungsfrist referenzen ergebnis absagegrund feedback rueckzug_grund interesse tags notizen status naechster_schritt naechster_schritt_faellig erstellt_am geaendert_am".split(" "),
  contacts: "id owner_id application_id firma name rolle email telefon linkedin art".split(" "),
  interviews: "id owner_id application_id datum format teilnehmer fragen_gestellt eigene_fragen eindruck aufgabe aufgabe_frist".split(" "),
  application_events: "id application_id owner_id datum alter_status neuer_status notiz".split(" "),
};

// Speicherpfad-tauglicher Dateiname: nur [A-Za-z0-9._-], höchstens 100 Zeichen.
export function dateiname(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100) || "datei";
}
