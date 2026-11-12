// Prüft, was ein Besucher ohne Anmeldung mit dem öffentlichen Supabase-Schlüssel lesen darf (Migration 007).
// Aufruf in web/: node --env-file=.env.local scripts/pruefe-anon.mjs   → Exit 1, sobald eine Erwartung nicht stimmt.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY fehlen"); process.exit(1); }
const H = { apikey: key, "Content-Type": "application/json" };

const erlaubt = [
  "jobs?select=id,titel,unternehmen,steckbrief,companies!inner(groesse_klasse,kategorie,aktiv)&limit=1",
  "laeufe?select=datum&limit=1",
  "rpc/facetten",
];
const verboten = [
  "jobs?select=text&limit=1", "jobs?select=abschnitte&limit=1", "jobs?select=beschreibung_kurz&limit=1",
  "companies?select=logo_url&limit=1", "laeufe?select=bericht&limit=1",
  "applications?select=id&limit=1", "wichtige_punkte?select=begriff&limit=1",
];
const leer = ["jobs?select=id&status=eq.geschlossen&limit=1", "jobs?select=id&sichtbar=eq.false&limit=1"];

const hole = async (p) => {
  const r = await fetch(`${url}/rest/v1/${p}`, p.startsWith("rpc/") ? { method: "POST", headers: H, body: "{}" } : { headers: H });
  return { status: r.status, body: await r.json().catch(() => null) };
};
let fehler = 0;
const zeile = (ok, art, p, r) => { if (!ok) fehler++; console.log(`${ok ? "OK    " : "FEHLER"} ${art.padEnd(9)} ${r.status} ${p}`); };

for (const p of erlaubt) { const r = await hole(p); zeile(r.status === 200 && (p.startsWith("rpc/") || (Array.isArray(r.body) && r.body.length > 0)), "erlaubt", p, r); }
for (const p of verboten) { const r = await hole(p); zeile(r.status === 401 || r.status === 403 || r.body?.code === "42501", "verboten", p, r); }
for (const p of leer) { const r = await hole(p); zeile(r.status === 200 && Array.isArray(r.body) && r.body.length === 0, "leer", p, r); }
console.log(fehler ? `${fehler} Erwartung(en) verletzt` : "Alle Erwartungen erfüllt");
process.exit(fehler ? 1 : 0);
