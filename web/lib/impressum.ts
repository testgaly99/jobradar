// Impressumsangaben nur aus Umgebungsvariablen (das Repo ist öffentlich). null, sobald einer der vier Werte fehlt.
export type Impressum = { name: string; strasse: string; ort: string; email: string };

export function impressum(env: Record<string, string | undefined> = process.env): Impressum | null {
  const [name, strasse, ort, email] = ["IMPRESSUM_NAME", "IMPRESSUM_STRASSE", "IMPRESSUM_ORT", "IMPRESSUM_EMAIL"].map((k) => env[k]?.trim() ?? "");
  return name && strasse && ort && email ? { name, strasse, ort, email } : null;
}
