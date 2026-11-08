// Supabase-Fehler auf verständliches Deutsch abbilden.
export function fehlerText(e: { code?: string; message?: string }): string {
  const m = (e.message ?? "").toLowerCase();
  switch (e.code) {
    case "invalid_credentials": return "E-Mail oder Passwort stimmt nicht.";
    case "email_not_confirmed": return "Bitte bestätige zuerst deine E-Mail-Adresse (Link im Postfach).";
    case "user_already_exists": case "email_exists": return "Mit dieser E-Mail gibt es schon ein Konto. Bitte melde dich an.";
    case "weak_password": return "Das Passwort ist zu schwach. Nimm mindestens 8 Zeichen.";
    case "signup_disabled": return "Neue Registrierungen sind ausgeschaltet.";
    case "over_request_rate_limit": case "over_email_send_rate_limit": return "Zu viele Versuche. Bitte warte kurz und probiere es dann erneut.";
    case "same_password": return "Das neue Passwort muss anders sein als das alte.";
    case "validation_failed": return "Bitte prüfe deine Eingabe.";
  }
  if (m.includes("invalid login")) return "E-Mail oder Passwort stimmt nicht.";
  if (m.includes("fetch")) return "Keine Verbindung. Bitte prüfe dein Internet.";
  return "Das hat leider nicht geklappt. Bitte versuche es erneut.";
}
