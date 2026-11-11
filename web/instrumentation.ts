// Läuft einmal beim Start jeder Server-Instanz. Vercel reserviert die Variable TZ, darum hier gesetzt:
// "heute", "Diese Woche" und Interview-Uhrzeiten rechnen sonst in UTC statt deutscher Zeit.
export function register() {
  process.env.TZ = "Europe/Berlin";
}
