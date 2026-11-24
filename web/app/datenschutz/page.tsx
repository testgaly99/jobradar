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
        <li>Briefkopf und Anschreiben-Vorlagen liegen wie deine Bewerbungen in Supabase (Frankfurt). Der Knopf „Mit Claude bearbeiten“ öffnet dein eigenes Claude-Konto; der Text geht dann an Claude.</li>
        <li>Vercel für die Website</li>
        <li>Ein tägliches Backup der Datenbank in einem privaten GitHub-Repo. Es enthält auch die Liste der Konten mit Name und E-Mail. Dateien sind darin nicht enthalten.</li>
      </ul>
      <h2>Lebenslauf</h2>
      <p>Lebensläufe speichert Jobradar nur mit deiner Einwilligung, die du vor dem ersten Hochladen erteilst. Dabei liest eine KI deinen Lebenslauf aus und gleicht ihn mit Stellenanzeigen ab. Gespeichert wird, wann du welcher Fassung des Einwilligungstexts zugestimmt hast. Ein Lebenslauf kann besondere Kategorien personenbezogener Daten enthalten (z. B. Gesundheit oder Religion, Art. 9 DSGVO).</p>
      <ul>
        <li>Speicherort: Supabase in Frankfurt (EU), Datei und daraus ausgelesener Text.</li>
        <li>Zweck: Abgleich deines Lebenslaufs mit den Anforderungen einer Stelle und Empfehlung der passenden CV-Version.</li>
        <li>Beim Betreiber (Admin) liest nachts die KI Claude von Anthropic (USA) den Lebenslauf, über sein eigenes Abo. Bei allen anderen Konten läuft die KI nur in deinem Browser auf deinem Gerät (das Sprachmodell unten und, wenn du es in Chrome einschaltest, Chromes eingebaute KI); dein Lebenslauf geht an keinen KI-Dienst.</li>
        <li>Für den Vergleich nach Bedeutung nutzt Jobradar das offene Sprachmodell „multilingual-e5-small“ (MIT-Lizenz). Jobradar liefert es selbst aus; dafür wird nichts an Dritte geschickt.</li>
        <li>Löschen: Löschst du einen Lebenslauf unter „Unterlagen“, sind Datei, Text und alle Abgleich-Ergebnisse dazu sofort entfernt. Das ist zugleich der Widerruf deiner Einwilligung. Lebenslauf-Daten sind nicht im täglichen Backup.</li>
        <li>Export: unter „Konto“ mit „CV-Daten exportieren“.</li>
      </ul>
      <h2>Wer es sieht</h2>
      <p>Nur du. Auch der Betreiber sieht deine Bewerbungen nicht über die Website. Technisch hat er als Datenbank-Inhaber Zugriff.</p>
      <p>Der Betreiber sieht pro Konto nur Zahlen: letzte Anmeldung und Anzahl der Bewerbungen, keine Inhalte.</p>
      <p>Der Admin sieht den Firmennamen und kann die Firma für alle freigeben.</p>
      <h2>Löschen</h2>
      <p>Jederzeit unter „Konto“. Alles wird sofort entfernt. Ausgenommen ist nur das Konto des Betreibers. Aus dem Backup verschwindet es mit dem nächsten täglichen Lauf, die Git-Historie des privaten Backups behält ältere Stände.</p>
      <h2>Sonstiges</h2>
      <p>Keine Werbung, kein Tracking, keine Weitergabe.</p>
      <p>Stand: 2026-11-24</p>
    </div>
  );
}
