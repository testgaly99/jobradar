import { impressum } from "@/lib/impressum";

export const metadata = { title: "Datenschutz – Jobradar" };
export const dynamic = "force-dynamic"; // Verantwortlicher aus den Vercel-Einstellungen

export default function Seite() {
  const i = impressum();
  return (
    <div className="karte prosa">
      <h1>Datenschutz</h1>
      <h2>Verantwortlich</h2>
      <p>{i ? <>{i.name}, <a href={`mailto:${i.email}`}>{i.email}</a>.</> : "Noch nicht eingerichtet."} Jobradar ist ein privates, nicht-kommerzielles Projekt für Freunde.</p>
      <h2>Ohne Anmeldung</h2>
      <p>Die Stellenliste ist ohne Konto lesbar. Dabei setzt Jobradar keine Cookies und zählt keine Besucher. Vercel speichert technische Server-Protokolle (IP-Adresse, Zeitpunkt, aufgerufene Adresse) kurzzeitig, um die Seite zu betreiben.</p>
      <h2>Was gespeichert wird</h2>
      <ul>
        <li>Dein Google-Name und deine E-Mail für die Anmeldung</li>
        <li>Deine Bewerbungen, Kontakte, Interviews, Notizen und hochgeladenen Dokumente</li>
      </ul>
      <h2>Wo</h2>
      <ul>
        <li>Supabase (Server in Frankfurt, EU) für Datenbank und Dateien</li>
        <li>Vercel für die Website</li>
        <li>Ein tägliches Backup der Datenbank in einem privaten GitHub-Repo. Es enthält auch die Liste der Konten mit Name und E-Mail. Dateien sind darin nicht enthalten.</li>
      </ul>
      <h2>Wer es sieht</h2>
      <p>Nur du. Auch der Betreiber sieht deine Bewerbungen nicht über die Website. Technisch hat er als Datenbank-Inhaber Zugriff.</p>
      <p>Der Betreiber sieht pro Konto nur Zahlen: letzte Anmeldung und Anzahl der Bewerbungen, keine Inhalte.</p>
      <h2>Löschen</h2>
      <p>Jederzeit unter „Konto“. Alles wird sofort entfernt. Ausgenommen ist nur das Konto des Betreibers. Aus dem Backup verschwindet es mit dem nächsten täglichen Lauf, die Git-Historie des privaten Backups behält ältere Stände.</p>
      <h2>Sonstiges</h2>
      <p>Keine Werbung, kein Tracking, keine Weitergabe.</p>
      <p>Stand: 2026-11-12</p>
    </div>
  );
}
