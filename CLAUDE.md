# CLAUDE.md – Projekt „Jobsuche“

Claude Code liest diese Datei zu Beginn jeder Sitzung. Sie ist die **einzige Quelle für Anforderungen und Arbeitsweise**. Widerspricht eine spätere Anweisung im Chat dieser Datei, gilt der Chat. Ändert eine Entscheidung etwas hier, wird diese Datei nach Rückfrage angepasst, damit sie nie veraltet oder widersprüchlich ist.

---

## 1. Wer ich bin und was das für dich heißt

- Ich bin **kompletter Programmier-Anfänger**. Ich kann Code nicht prüfen und kenne weder Git noch Terminal.
  - Sag mir bei jedem Schritt, **was ich selbst tun muss**: einfache Sprache, nummerierte Schritte.
  - Erkläre jeden Fachbegriff beim ersten Auftauchen in einem Satz.
  - Triff keine stillen Annahmen. Hat eine Entscheidung zwei vernünftige Antworten, frag mich.
  - **Frag vorher**, bevor du etwas Unumkehrbares tust (Daten löschen, Datenbank umbauen, Historie umschreiben, veröffentlichen), und sag, was passiert.
- Ich wohne in **München**. Die Jobsuche dreht sich vor allem um München und Umgebung sowie Remote.
- Ich arbeite beruflich im Finanzsektor. Das Projekt ist **privat**. Firmen- und Kundendaten aus meinem Job kommen nicht hinein.
- Antworte auf Deutsch: kurz und handlungsorientiert. Rückfragen, Risiken und meine To-dos trotzdem immer nennen.
- **Alles in diesem Projekt soll schlank sein:** wenige Dateien, keine doppelten Angaben, nichts „für später“.

---

## 2. Ziel

Eine eigene Website zur Jobsuche, die besser filtert als Stepstone, Indeed, LinkedIn oder Glassdoor.
- Die Stellen kommen direkt von den **offiziellen Karriereseiten** der Firmen, die auf ausgewählten **seriösen Ranking-Listen** stehen (Abschnitt 4.8). Dazu kommen **Zusatzfirmen**, die jeder Nutzer selbst einträgt (Phase 4, Entscheidung 2026-11-12). Ausbauziel sind rund 1000 Firmen.
- Dazu kommt ein **persönlicher Bewerbungs-Tracker**.
- **Nur Stellen, die ein Studium voraussetzen** (Entscheidung 2026-11-09). Andere Stellen werden gar nicht gespeichert.
  - Stufe 1, sofort per Regeln: Titel eindeutig nicht-akademischer Berufe fliegen beim Abrufen raus (z. B. Warenverräumer, Reinigungskraft, Filialleitung, Mechatroniker, Fahrer).
  - Stufe 2, mit dem Groq-Paket: Groq stuft jede Anzeige ein: Studium „ja“, „nein“ oder „unklar“ und Tätigkeit „anspruchsvoll“ oder „einfach“. Gespeichert wird bei „ja“ und „unklar“.
  - **Ausnahme Prestige-Arbeitgeber** (z. B. Magnificent 7): Dort bleiben auch Stellen ohne Studium, wenn die Tätigkeit anspruchsvoll ist (z. B. Program Manager bei Google). Einfache Tätigkeiten fliegen auch dort raus. Welche Firmen als Prestige gelten, bestimmen die Prestige-Listen unter den Ranking-Listen (Abschnitt 4.8).
- Freunde bekommen später eigene Konten.

Wichtigste Filter, in dieser Reihenfolge:
1. Liste (aus welchem Ranking die Firma stammt)
2. Unternehmensgröße
3. Kategorie des Unternehmens
4. alle weiteren Filter (Abschnitt 4.1)

---

## 3. Harte Anforderungen (nicht verhandelbar)

1. **Kostenlos.** Keine Dienste, die Geld kosten oder eine Kreditkarte verlangen, ohne meine ausdrückliche Zustimmung. Grenzen von Gratis-Tarifen nennst du mir, bevor wir uns festlegen.
2. **Keine API-Kosten für KI.**
   - KI im laufenden Betrieb ist erlaubt, nur auf zwei Wegen (Stand 2026-11-09):
     - **Öffentliche Stellenanzeigen zusammenfassen:** Groq im Gratis-Tarif (großes Llama-Modell), Secret `GROQ_API_KEY`. An Groq gehen **nur Anzeigentexte**, nie persönliche Daten. Ist das Tageslimit erreicht, folgt der Rest am nächsten Tag. Kein Ausweichen auf Claude.
     - **Alles mit persönlichen Daten** (Lebenslauf-Abgleich, CV-Empfehlung, Anschreiben): nur über meinen Claude-Abo-Token (`claude setup-token`, in GitHub Actions als Secret `CLAUDE_CODE_OAUTH_TOKEN`).
   - Es gibt keine Ausweichlösung. GitHub Models wurde am 30.07.2026 abgeschaltet.
   - Ist das Kontingent erschöpft, wird der Rest in der nächsten Nacht ausgewertet.
   - **Nie ein kostenpflichtiger API-Schlüssel.**
3. **Zuverlässig und dauerhaft.** Daten dürfen nicht verloren gehen. Ich will mein Konto nicht neu anlegen und Verbindungen nicht ständig neu herstellen.
   - Prüfe bei jedem Gratis-Dienst **anhand der aktuellen offiziellen Doku**, ob es Löschfristen gibt, ob bei Inaktivität pausiert wird und ob Tokens ablaufen. Verlass dich nicht auf Vorwissen.
   - Bekannte Fallen:
     - Geplante GitHub-Actions-Workflows in öffentlichen Repos werden nach 60 Tagen ohne Repo-Aktivität abgeschaltet.
     - Google-OAuth-Apps im Status „Testing“ verlieren die Freigabe nach 7 Tagen.
     - Gratis-Datenbanken werden je nach Anbieter bei Inaktivität pausiert.
   - Von Anfang an gibt es ein **Backup** (Datenexport in eine Datei) und eine kurze Anleitung zum Wiederherstellen.
4. **Tokensparend.**
   - Das Scraping läuft als normales Programm ohne KI.
   - KI nur dort, wo Regeln nicht reichen.
   - Jede Stelle wird höchstens einmal ausgewertet, und nur neu, wenn sich ihr Text ändert.
   - Auch in unserer Zusammenarbeit: kurze Zusammenfassungen, Status in Dateien (Abschnitt 8).
5. **Legal und fair scrapen.**
   - Nur offizielle Karriereseiten bzw. deren Bewerbermanagement-Systeme. **Kein** Scraping von Stepstone, LinkedIn, Indeed, Glassdoor, kununu o. Ä.
   - `robots.txt` respektieren, höchstens 1 Anfrage pro Sekunde und Domain, eindeutiger User-Agent.
   - Keine Logins und keine CAPTCHAs umgehen.
   - Firmen, die das Abrufen erkennbar nicht wollen, werden markiert und übersprungen.
6. **Datenschutz.**
   - Hosting in der EU, sobald Freunde Daten ablegen.
   - Jeder sieht nur seine eigenen Daten. Das wird serverseitig erzwungen.
   - Passwörter speichern wir nie selbst, sondern nutzen einen etablierten Login-Dienst.
   - Google-Zugriffe nur lesend und minimal. Google-Tokens werden verschlüsselt gespeichert.
   - Jeder Nutzer kann seine Daten exportieren und sein Konto löschen.
7. **Keine Geheimnisse im Repo.**
   - Schlüssel und Tokens gehören in `.env` (steht in `.gitignore`) oder in GitHub Secrets.
   - Prüfe vor jedem Commit, dass keine Geheimnisse im Commit landen.
   - Sag mir, wo ich einen Schlüssel eintragen muss.

---

## 4. Funktionsumfang (Zielbild)

### 4.1 Filter der Jobsuche
- **Unternehmen**
  - Mitarbeiterzahl als frei wählbare Spanne
  - Branche (in der Oberfläche „Branche“, intern `kategorie`)
  - Rolle im Markt
  - Kundenbranche (bei Beratungen)
  - Eigentümerstruktur
  - Unternehmensalter
  - Mindestwert der Arbeitgeberbewertung. Diesen Wert pflege ich selbst pro Firma, weil kununu und Glassdoor das Auslesen verbieten.
  - Liste: das Ranking, aus dem die Firma stammt (erster Filter)
  - Später: Gesellschaft vs. Gruppe, feinere Finanzbranche
- **Rolle**
  - Seniority, abgeleitet aus den Anforderungen der Anzeige
  - Jahre Berufserfahrung
  - Personalverantwortung
  - Funktion (in der Oberfläche „Funktion“, intern `abteilung`/Bereich)
  - geforderter Abschluss (harte Regel, siehe Abschnitt 2)
  - Vertriebsanteil
  - Ausschlusswörter in Titel und Text
  - Später: fachliche Tags
- **Ort und Arbeitsmodell**
  - Umkreis um München
  - Pendelzeit mit ÖPNV, über eine kostenlose Routing-Lösung, z. B. offene MVV-Daten
  - Präsenztage
  - Remote-Gebiet
  - Workation
- **Gehalt und Vertrag**
  - nur Stellen mit Gehaltsangabe
  - Mindestgehalt, normalisiert auf Jahresbrutto
  - Gehaltsschätzung, wenn keine Angabe gemacht ist
  - variable Vergütung
  - Befristung
  - Urlaubstage
- **Qualität der Anzeige**
  - echtes Erstveröffentlichungsdatum (= erstmals gesehen)
  - Ghost-Job-Ampel
  - Abgleich mit der Karriereseite
  - Dubletten zusammenführen
  - Vermittler bzw. Personaldienstleister entschlüsseln
  - Ansprechpartner genannt
  - Bewerbungsweg
- **Suche**
  - exakter Titel-Match
  - eigene Synonymgruppen
  - gespeicherte Suchprofile
  - Sortierung
  - Facetten mit Trefferzahlen
  - Muss- und Soll-Kriterien
  - Passungs-Score aus meinem CV, mit Begründung
  - Skill-Lücken
  - Gehaltsbenchmark
- **Workflow**
  - Sperrliste für Firmen
  - Merkliste: Das sind Bewerbungen im Status „Gemerkt“. Eine eigene Liste gibt es nicht.
  - Notizen
  - Kontakte
  - Nachfass-Erinnerung
  - Später: „gesehen“-Markierung
- **Benachrichtigungen**
  - täglicher Digest mit allem, was seit dem letzten Versand neu ist
  - Sofort-Alarm bei einem Top-Treffer
  - Beobachtung von Wunscharbeitgebern
  - Kanal: Telegram (kein Teams)

### 4.2 KI-Auswertung der Anzeigen
- **Per Regex, ohne KI:** Befristung, Urlaubstage, Gehaltszahlen, Schlagwörter wie „Remote“.
- **Per KI:** Seniority, Präsenztage, normalisiertes Gehalt, Vermittler, Personalverantwortung, Abschluss, Vertriebsanteil, Remote-Gebiet, Workation, variable Vergütung, Ghost-Job-Ampel.
- **Ablauf:** ein nächtlicher Batch-Lauf, nur für neue oder geänderte Stellen. Das Ergebnis ist JSON pro Stelle, gespeichert unter einem Hash des Anzeigentexts.
- **Modell:** Groq im Gratis-Tarif (nur öffentliche Anzeigentexte, Entscheidung 2026-11-09).
- **Passungs-Score und Skill-Lücken** laufen nur über Claude, damit mein CV nicht bei weiteren Anbietern landet.

### 4.3 Selbstreparatur
- **Erkennen:** Nach jedem Lauf gibt es einen Gesundheitscheck ohne KI. Ein Problem liegt vor, wenn:
  - eine Firma 0 Stellen liefert, obwohl sie in den letzten 7 Tagen welche hatte,
  - die Zahl der Stellen um mehr als 50 % fällt,
  - ein HTTP-, Timeout- oder Parser-Fehler auftritt,
  - Stellen ohne Titel oder Link auftauchen,
  - Firmendaten fehlen oder sich widersprechen.
- **Melden:** Pro Problem entsteht ein GitHub-Issue mit Log, HTML-Schnappschuss und den Trefferzahlen der letzten Tage. Zusätzlich bekomme ich eine Telegram-Nachricht mit Link.
- **Reparieren:**
  - Das Label `scraper-defekt` startet die Claude Code Action mit dem Abo-Token. Claude passt den Adapter an, testet gegen die echte Seite und öffnet einen Pull Request mit der Trefferzahl vorher und nachher.
  - **Ich merge selbst.** Kein Auto-Merge.
- **Firmendaten:**
  - Das Label `firmendaten-pruefen` startet eine Recherche durch Claude. Das Ergebnis ist ein Wert mit Quelle (Impressum, Geschäftsbericht oder Handelsregister).
  - Der Vorschlag kommt als Pull Request auf `firmen_korrekturen.csv`. Diese Datei hat **immer Vorrang** vor automatischen Werten. Ich kann dort auch selbst Werte eintragen.
- **Protokoll:** Es gibt ein Laufprotokoll pro Lauf und Firma und einen wöchentlichen Kurzbericht (Firmen mit 0 Stellen, offene Issues, neue Stellen).

### 4.4 Bewerbungs-Tracker
Eine Bewerbung entsteht auf einem dieser Wege:
- **Ein Klick aus einem Treffer** der Stellenliste.
- **Link einfügen** in der Bewerbungstabelle. Firma, Titel usw. werden **ohne KI** per Code ermittelt:
  - Bei Links auf Karriereseiten bzw. das ATS fragt der Code die offizielle Schnittstelle ab.
  - Bei Links von LinkedIn, Stepstone o. Ä. liest der Code nur Titel und Firma aus dem Link selbst. Die Seite wird **nicht** geöffnet. Danach sucht er die Stelle in der eigenen Stellenliste und in den gängigen ATS der Firma.
  - Ist nichts erkennbar, gibt es zwei Felder für Firma und Titel.
  - LinkedIn-Links aus Sammlung oder Suche (`currentJobId`) werden zu `linkedin.com/jobs/view/<nummer>/` vereinheitlicht, damit die Dublettenprüfung greift.
  - Optional lässt sich der Anzeigentext einfügen (z. B. am Handy); er landet in `snapshot_text`, falls es keinen Text aus Stellenliste oder ATS gibt.
- **Manuell**, z. B. bei Empfehlung, Headhunter oder nachgetragenen Bewerbungen.
- **Stelle:**
  - Firma, verknüpft mit den Firmendaten
  - Titel, Link, Quelle, Standort, Präsenzmodell
  - Snapshot der Anzeige als Text und PDF
  - Auszug aus Anforderungen und Aufgaben
- **Bewerbung:**
  - Datum, Weg, Referenznummer
  - Hinweis zum Bewerberportal, ohne Passwort
  - CV-Version, Anschreiben, Anlagen
- **Gehalt:**
  - Spanne laut Anzeige
  - eigener Wunsch
  - Angebot: fix, variabel, Urlaub, Benefits
  - Vergleich zum aktuellen Gehalt
- **Personen:**
  - Ansprechpartner mit Rolle, E-Mail, Telefon, LinkedIn
  - eigene Kontakte in der Firma
  - Empfehlungsgeber
- **Prozess:**
  - Status mit Verlauf
  - nächster Schritt mit Fälligkeit
  - Interviews: Datum, Format, Teilnehmer, Fragen, Eindruck
  - Case- und Testaufgaben mit Frist
- **Rahmen:** Starttermin, Kündigungsfrist, Referenzen
- **Ergebnis:**
  - Absagegrund, Feedback
  - Grund für ein Zurückziehen
  - Angebot angenommen oder abgelehnt
- **Einschätzung:** Interesse 1–5, Tags, Notizen
- **Status:** Gemerkt → Beworben → Im Gespräch → Angebot → Abgeschlossen (Zusage, Absage, zurückgezogen)
- **Erinnerungen:**
  - Nachfassen nach 14 Tagen ohne Antwort
  - Antwortfrist bei einem Angebot
  - Markierung „Anzeige offline“, wenn die Stelle einer laufenden Bewerbung verschwindet
- **Ansichten:**
  - Kanban nach Status
  - Liste mit Filtern
  - Archiv mit Volltextsuche
  - Auswertung: Antwortquote, Zeit bis zur Antwort, Quote nach Bewerbungsweg und nach Firmentyp

### 4.5 Dokumente und Vorlagen
- **CV-Versionen** (PDF und Word) mit Name und Datum. Eine Version bleibt erhalten, solange eine Bewerbung auf sie verweist.
- **Anschreiben-Vorlagen** mit den Platzhaltern `{{firma}}`, `{{stelle}}`, `{{ansprechpartner}}`, `{{anrede}}` und `{{quelle}}`.
- **Textbausteine** und **Anlagen**: Anlagen werden einmal hochgeladen und pro Bewerbung angehakt.
- Optional:
  - ein Anschreiben-Entwurf per KI, über den Abo-Token
  - Vorlagen für andere freigeben (Standard ist privat)
- Dateien liegen in einem Speicher pro Nutzer. Zugriff gibt es nur über kurzlebige signierte Links.

### 4.6 Konten für mich und Freunde
- **Anmeldung:**
  - Freunde melden sich **nur mit Google** an (Supabase Auth).
  - Ich habe zusätzlich mein bestehendes Konto mit E-Mail und Passwort.
  - Wer sich mit E-Mail anmeldet, bekommt keine Gmail- und Kalender-Anbindung.
- **Zugang:**
  - Ich teile den Link zur Website. Wer sich mit Google anmeldet, ist sofort drin. Es gibt keine Einladungsliste.
  - **Ohne Konto (Entscheidung 2026-11-11, Paket „Öffentlicher Zugang“):** Stellenliste und Stellenseiten sind ohne Anmeldung lesbar, aber nur Liste, Filter und Steckbrief; Anzeigentext, Logos, Ranglisten und alles Persönliche nur angemeldet. Die Datenbank erzwingt das (Migration 007). Nicht auffindbar (noindex), Impressum aus Umgebungsvariablen.
  - Solange die Google-App im Testmodus ist, kommen nur Google-Konten hinein, die ich in der Google Cloud Console als Testnutzer eingetragen habe (höchstens 100).
  - Erst mit eigener Domain wird die App veröffentlicht. Dann kann sich jeder mit dem Link anmelden (siehe Backlog).
- **Größe:** zuerst 1–5 Freunde, perspektivisch bis 20.
- **Datentrennung** auf Datenbankebene (Row Level Security). Getestet wird, dass Person A die Daten von Person B nicht sieht. Das gilt auch für mich als Admin.
- **Gemeinsam genutzt** werden Firmendaten und gescrapte Stellen. Freunde sehen die Stellenliste und ihren eigenen Tracker.
- **Rollen:**
  - Ich bin Admin. Auf der Seite „Nutzer“ sehe ich alle angemeldeten Nutzer mit Name, E-Mail und „dabei seit“.
  - „Entfernen“ löscht nach Bestätigung Konto und Daten. Vorher erscheint der Hinweis, die Person solle zuerst exportieren.
  - Später verwalte ich als Admin auch Scraper-Quellen und Firmendaten. Alle anderen sind normale Nutzer.
- **Export und Löschen:**
  - Bewerbungen lassen sich als eine CSV-Tabelle mit klickbaren Links exportieren (Dokumente nur mit Namen).
  - **Konto löschen** kann jeder selbst, außer dem Admin: Mein Konto lässt sich nie löschen. Es endet erst, wenn Website und Datenbank entfernt werden. Die Seite empfiehlt dabei ausdrücklich den Export und bietet ihn direkt daneben an.
  - Zum Bestätigen wird „LÖSCHEN“ eingetippt. Danach sind alle Daten und Dateien sofort und endgültig entfernt.
- **Datenschutzerklärung:** eine kurze Seite. Kontakt: Mark Galysh, markgaly99@gmail.com.
- **Domain-Wechsel:** Die Adresse der Website steht nie im Code, nur in den Einstellungen von Vercel, Supabase und Google.

### 4.7 Gmail und Google Kalender
- Der Zugriff ist **nur lesend**. Termine ändert die Website nur, wenn sie sie selbst angelegt hat.
- Die Google-App wird veröffentlicht, ohne dass Google sie prüft. Folgen: beim Verbinden erscheint die Warnung „App nicht überprüft“, und es sind höchstens 100 Nutzer möglich. **Vor der Umsetzung prüfen**, ob das mit den Gmail-Rechten dauerhaft funktioniert.
- **Interview-Briefing** 24 Stunden und 1 Stunde vor dem Termin, per Mail oder Telegram. Es enthält:
  - Firma
  - Stelle
  - Gesprächspartner
  - meine Unterlagen
  - bisherigen Verlauf
  - Vorbereitungsfragen
- **Zuordnung eines Termins zu einer Bewerbung**, wenn eine dieser Bedingungen gilt:
  - ein Teilnehmer hat die Firmendomain,
  - der Firmenname steht im Titel,
  - der Termin wurde aus der Bewerbung angelegt.
- **Status aus Gmail:**
  - Gelesen werden nur Mails von Domains mit laufender Bewerbung.
  - Erkannt werden Eingangsbestätigung, Einladung, Absage und Angebot.
  - Der neue Status wird nur **vorgeschlagen**. Ich bestätige ihn mit einem Klick.
  - Der Mailverlauf wird an die Bewerbung gehängt.

### 4.8 Ranking-Listen (Herzstück der Firmenauswahl, Entscheidung 2026-11-09)
- **Welche Listen:** echte, seriöse Rankings deutscher oder internationaler Herausgeber (Magazine wie WirtschaftsWoche, Institute), etwa Top-Arbeitgeber, Mitarbeiterzufriedenheit, beliebteste Arbeitgeber, Top-Startups, vielversprechendste Startups, Gehalt oder Prestige. Das sind nur Ideen: Die Listen werden in einem eigenen Recherche-Schritt anhand **realer** Rankings festgelegt (Name, Herausgeber, Rhythmus, Umfang, frei lesbar?). Der Katalog liegt dann in `docs/`.
- **Alle 4 Wochen** prüft ein Lauf, ob es neue Ausgaben gibt. Firmen auf einer Liste werden **automatisch** aufgenommen und angebunden. Fällt eine Firma von allen Listen, verschwinden ihre Stellen beim nächsten Check; Bewerbungen bleiben immer erhalten.
- **Listen-Firmen plus Zusatzfirmen.** Bis die Listen live sind, bleiben die heutigen Firmen aus `data/companies.csv`; danach bleibt, wer auf einer Liste steht, dazu die Zusatzfirmen der Nutzer.
- **Zusatzfirmen (Entscheidung 2026-11-12, kommt mit Phase 4):** Jeder Nutzer kann einen Firmennamen oder Link eingeben; Karriereseite und ATS werden automatisch erkannt. Standard: Die Stellen sieht nur dieser Nutzer (in der Datenbank abgeschirmt, nicht in der öffentlichen `companies.csv`). Der Admin kann eine Firma für alle freigeben. Welche ATS-Systeme dazukommen, wird zu Beginn von Phase 4 geklärt.
- In der Stellenliste ist **„Liste“ der erste Filter**. Bei jeder Firma steht immer, **welchen Rang sie in welchem Ranking** hat (z. B. „stern Beste Arbeitgeber 2026: Platz 12“). Nach **jedem einzelnen Ranking** kann man filtern und sortieren (Entscheidung 2026-11-10).
- Startup-Listen dürfen europäisch oder amerikanisch sein, Gehaltslisten dürfen nur Tech abdecken. Bedingung: Die Firma bietet Stellen in Deutschland an.
- **Quellen (Entscheidung 2026-11-10, Recherche `docs/ranking-recherche-v2.md`, vorerst nur Eigennutzung):**
  - **Offene Lizenzen, automatisch:** EU R&D Scoreboard (CC BY), Technology Dashboard des Europäischen Patentamts, DPMA Top 50, EIC-Accelerator-Geförderte über CORDIS, Börsenindex-Mitglieder über Wikidata (CC0), Wikipedia-Unicorn-Liste (CC BY-SA), US-Arbeitsministerium Visa-Gehaltsdaten (gemeinfrei, nur als Gehalts-Indikator).
  - **Über die Text-und-Data-Mining-Schranke (§ 44b UrhG), automatisch:** Great Place to Work Deutschland, Top Employers Deutschland, TOP 100 Innovatoren. Nur solange die Seite kein Verbot und keinen maschinenlesbaren Vorbehalt setzt; jede Quelle hat einen Schalter zum sofortigen Abschalten. **Nicht:** HTGF (setzt ein Vorbehalts-Signal).
  - **Von Hand, einmal im Jahr:** Pressemitteilungen von trendence, Universum und LinkedIn (Beliebtheit bei Absolventen), Spitzenplätze aus Statistas CC-BY-ND-Infografiken.
    - **Erinnerung per E-Mail (Entscheidung 2026-11-10):** Der 4-Wochen-Lauf legt zum Erscheinungstermin jeder Hand-Quelle ein GitHub-Issue an („trendence Top 50 2026 übernehmen“, mit Link und Klick-Anleitung). GitHub schickt dafür automatisch eine E-Mail an den Repo-Besitzer; kein eigener Mail-Dienst nötig. Das Issue bleibt offen, bis die Daten eingelesen sind. **Sobald die Gmail-Anbindung (Phase 3) steht, geht die Erinnerung zusätzlich als E-Mail an den Admin** (`ADMIN_EMAIL`); To-do in `docs/STATUS.md`.
  - **Nicht, auch nicht privat:** Statista-Gesamtlisten (stern, Forbes, FT, TIME, Capital, FOCUS), Levels.fyi, LinkedIn-Website, zeit.de, Sifted, Glassdoor, Crunchbase, abgeschriebene Listen auf Wikipedia/Kaggle, die Website von Y Combinator (Nutzungsbedingungen verbieten Scraping und Data-Mining ausdrücklich, geprüft 2026-11-12). Höchstens ein Link zur Ranking-Seite.
  - **Y Combinator über Wikidata prüfen (Wunsch 2026-11-12, Phase 4):** YC-Firmen nur aus Wikidata (CC0) holen, z. B. Firmen mit Investor „Y Combinator“, und vorher prüfen, wie vollständig das ist. Bedingung wie immer: Die Firma bietet Stellen in Deutschland an.
- **Speicherregeln (Entscheidung 2026-11-10):** Rohseiten werden sofort nach dem Auslesen gelöscht. Gespeichert werden nur Firmenname, Rang, Listenname, Jahr und Quell-Link. Jede Ausgabe lebt bis zur nächsten Ausgabe, höchstens 13 Monate, dann wird sie gelöscht. Quelle und Lizenz stehen sichtbar in der Website. Abruf höchstens 1× je Quelle und Monat, eigener User-Agent mit Kontakt-E-Mail, robots.txt vor jedem Abruf.
- **Für Freunde oder öffentlich (Backlog „Live gehen“):** Eine Liste wird nur genutzt, wenn der Herausgeber die Weiterverwendung ausdrücklich erlaubt (Lizenz, Nutzungsbedingungen, offene Lizenz wie CC) oder schriftlich zugestimmt hat. „Unklar“, „nur robots.txt erlaubt es“ oder „sind ja nur Fakten“ reicht nicht. Lässt sich für eine Liste kein solcher Weg finden, wird sie weggelassen. Auch Herunterladen von Hand ersetzt die Erlaubnis nicht. Der Katalog: `docs/ranking-katalog.md`, die rechtliche Prüfung: `docs/ranking-legal.md`.
- Die Prestige-Listen bestimmen die Ausnahme beim Studiums-Filter (Abschnitt 2).

---

## 5. Architektur

**Heute in Betrieb (nach Phase 1):**
- Ein Python-Scraper läuft täglich per GitHub Actions und schreibt in Supabase.
- Die Website ist mit Next.js in `web/` gebaut. Der Umzug zu Vercel ist ein offenes To-do in Phase 2.
- Abgedeckt sind 4 Firmen.

**Zielbild (entschieden 2026-11-08, Gratis-Tarife geprüft):**

| Baustein | Festlegung | Gratis-Grenzen und Fallen |
|---|---|---|
| Datenbank, Login, Dateien | Supabase, Region Frankfurt | Pausiert nach ca. 1 Woche ohne Datenbank-Aktivität. Der tägliche Scraper-Lauf schreibt in die Datenbank und hält sie wach. Limits: 500 MB Datenbank, 1 GB Dateien, 50 MB pro Datei, 2 Projekte. |
| Scraper und Hintergrundjobs | Python, zeitgesteuert per GitHub Actions (Digest, Alarme, Briefings, Gmail-Abgleich, Erinnerungen) | Im öffentlichen Repo unbegrenzt gratis. Abschaltung nach 60 Tagen ohne Aktivität; der tägliche Commit verhindert sie. |
| KI-Auswertung der Anzeigen | Groq Gratis-Tarif (Llama 70B) | Etwa 1.000 Anfragen pro Tag; Rest am nächsten Tag. Nur öffentliche Texte. |
| KI mit persönlichen Daten und Reparatur | Claude Code Action mit Abo-Token | Der Verbrauch zählt gegen das Abo-Kontingent. |
| Website | Next.js auf Vercel (Hobby) | Nur private, nicht-kommerzielle Nutzung. Zeitgesteuerte Jobs laufen deshalb über GitHub Actions statt über Vercel. |
| Benachrichtigung | Telegram-Bot, später zusätzlich Google Kalender (kein Teams). E-Mail erst mit dem Mail-Paket. | – |

- Die Jobsuche zieht in Phase 1 von GitHub Pages in die neue Website um. Danach wird GitHub Pages abgeschaltet.
- **Backup:** Das private Repo `jobradar-privat` sichert täglich alle Supabase-Tabellen als Datei. Dateien wie CVs werden nicht gesichert. Zusätzlich gibt es auf der Website den Knopf „Meine Daten exportieren“ (Excel).
- Das Repo bleibt öffentlich und enthält nur Code und die Firmenliste. Persönliche Daten liegen nur in Supabase.

Tabellen im Zielbild:
- **Gemeinsam:**
  - `companies`: Name, Domain, Mitarbeiterzahl, Typ, Rolle im Markt, Eigentümer, Gründungsjahr, Kundenbranche, Bewertung, Karriere-URL, Adapter
  - `jobs`: Firma, Titel, URL, Text, Text-Hash, erstmals gesehen, zuletzt gesehen, offline seit, extrahierte Felder, Ghost-Score
- **Pro Nutzer:** `profiles`, `search_profiles`, `target_companies`, `blocklist`, `watchlist`, `applications`, `application_events`, `contacts`, `documents`, `templates`
- **Im Repo:** `firmen_korrekturen.csv`. Ihre Werte überschreiben die automatischen Firmendaten.

---

## 6. Phasen

Jede Phase muss für sich benutzbar sein und beginnt mit einer eigenen Klärung und einem eigenen Plan (Abschnitt 7).

**Reihenfolge ab 2026-11-09:** 2b abschließen → Tracker-Paket (Design `docs/superpowers/specs/2026-11-09-tracker-paket-design.md`, freigegeben) **erledigt (2026-11-11)** → Groq-Paket (Zusammenfassungen, Studium ja/nein, Firma/Titel aus eingefügtem Text) → Phase 4 → Phase 3 → Phase 5 → Phase 6. Das Paket „Firmen anbinden“ (8 weitere Firmen, Plan `docs/plans/2026-11-09-firmen-anbinden.md`) läuft parallel.

0. **Erledigt:** Scraper-Grundlage mit 4 Firmen, statische Website und täglicher Lauf (Version 1, 2026-11-07).
1. **Erledigt (Code, 2026-11-08): Tracker und neue Website für mich allein:**
   - Login (Google oder E-Mail und Passwort).
   - Stellenliste aus Supabase mit den Filtern Größe, Kategorie, Erfahrungslevel, Arbeitsmodell, Vertragsart, Bereich, Unternehmen, Stadt, Remote, Stichwort und „neu seit“, jeweils mit Trefferzahlen.
   - Bewerbung per Klick aus einem Treffer, per Link oder manuell.
   - Alle Felder aus 4.4, dazu Kanban, Tabelle, Notizen, Ansprechpartner, Interviews und Upload von CV und Anschreiben.
   - Tägliches Backup und Export.
   - Die Daten werden übernommen, und GitHub Pages wird abgeschaltet.
   - **Nicht in Phase 1:** Erinnerungen, „Anzeige offline“, Auswertung.
2. **Freunde (geklärt 2026-11-08):**
   - Anmeldung per Google über den geteilten Link
   - Admin-Seite „Nutzer“
   - Konto löschen mit Export-Empfehlung
   - Datenschutzerklärung
   - Datentrennung testen
   - Als letzter Schritt meine offenen To-dos aus `docs/STATUS.md`, darunter Vercel und die Migrationen.
2b. **Website-Überarbeitung (geklärt 2026-11-08, nach meinem Klicktest), vor dem Einladen von Freunden:**
   - **Stellenliste:**
     - Größe aufsteigend sortiert, mit „Mitarbeitende“.
     - Filter „Branche“ (statt Kategorie) und „Funktion“ (statt Bereich).
     - Neuer Filter „Land“ (Deutschland, Österreich, Schweiz, Remote; die Daten kommen mit Phase 4).
     - Erfahrungslevel mit Jahren: Junior 0–2, Mid 2–5, Senior 5–8, Lead 8+ (aus dem Titel abgeleitet).
     - „Online seit“ statt „erstmals gesehen“, als Filter mit Feldern Heute, 3 Tage, 7 Tage, 30 Tage. Das Abzeichen „Neu“ gilt nur bis 3 Tage, mit Erklärung.
     - Suche standardmäßig nur im Titel, Volltext zuschaltbar.
     - Städte bereinigt (kein „Munich, Germany, Germany“ oder „Berlin Office“). Bei Stadtfilter nur diese Stadt, sonst erste Stadt plus „+N weitere“.
     - Kein Firmen-Werbetext. „Startup / Venture-finanziert“ wird ausgeblendet, bis echte Finanzierungsdaten da sind (Phase 4).
   - **Merken und Detailseite:**
     - Knopf „Merken“ an jeder Stelle (Status „gemerkt“).
     - Klick auf eine Stelle öffnet eine eigene Detailseite mit Aufgaben, Anforderungen und Benefits als Stichpunkte, ohne KI aus den Zwischenüberschriften zerlegt, dazu „Original-Anzeige öffnen“ und „Ich habe mich beworben“.
     - Dieselbe Gliederung ersetzt den Fließtext-Snapshot in Bewerbungen.
   - **Navigation:** Reiter „Dokumente“ entfällt, der Export zieht nach „Konto“.
   - **Bewerbungen (2026-11-12):** Reiter „Meine Bewerbungen“ (oben Kanban-Board, darunter Liste links und Detailspalte rechts, Auswahl als `?id=` in der Adresse, am Handy klappt das Detail unter der Zeile auf; bearbeitet wird im Seitenfenster), „+ Bewerbung hinzufügen“ (Formular) und „Auswertung“. `/bewerbungen/kanban` leitet auf `/bewerbungen` um.
   - **Konto:** Name, E-Mail, Anmeldeart, dabei seit, Bewerbungen nach Status, Export. „Konto löschen“ klein unten.
   - **Admin „Nutzer“:**
     - Übersichtlicher, „Entfernen“ im „…“-Menü.
     - Name nur bei Google-Konten.
     - Einblicke nur als Zahlen ohne Inhalte: pro Nutzer letzte Anmeldung und Anzahl Bewerbungen, gesamt aktive Nutzer 7/30 Tage und Bewerbungen pro Woche. Die Datenschutzerklärung nennt das.
   - **Design:** mit dem Skill Hallmark, Variante „utilitär“ (`web/app/stil/utilitaer.css`). Das Aussehen steckt nur in dieser Datei, `globals.css` hat nur den Aufbau.
   - **Steckbrief statt Textwand (ohne KI):**
     - Der Scraper zieht per Regeln heraus: Erfahrung in Jahren, Sprachen, Gehalt (falls angegeben), Sicherheitsüberprüfung.
     - Die Detailseite zeigt oben den Steckbrief, die gegliederte Anzeige eingeklappt darunter.
     - In der Stellenliste steht eine Kurzbeschreibung. Welche Felder sie zeigt, stellt jeder Nutzer auf der Konto-Seite selbst ein.
     - „Kurz gesagt“, Top-3-Anforderungen und „Auffällig“ brauchen KI: per Groq, nach einer Probe mit 20 Anzeigen (eigenes Paket direkt nach 2b).
   - **Wichtige Punkte:** Auf der Konto-Seite pflege ich Begriffe, die mir bei einer Stelle wichtig sind. Kommen sie in einem Stichpunkt der Anzeige vor, werden sie auf der Detailseite hervorgehoben. Reiner Textvergleich, ohne KI: Ein Begriff trifft ganze Wörter und Wortanfänge („Team“ trifft „Teamfähigkeit“). Übergangslösung; in Phase 6 kommt der Abgleich nach Bedeutung per KI dazu.
   - **Gegliederte Snapshots für alle:** Jede Bewerbung bekommt die gegliederte Anzeige, auch bestehende. Der tägliche Lauf rüstet fehlende Snapshots automatisch nach, solange die Stelle noch online ist.
3. **Kalender und Gmail:** Google-Anbindung, Interview-Briefing, Statusvorschläge, Nachfass-Erinnerung, Erinnerungs-Mail an den Admin für die jährlichen Hand-Quellen der Rankings (4.8).
   - **Eigenes Paket, später zu klären:** Anschreiben-Vorlagen, Textbausteine und Anlagen pro Bewerbung (4.5).
4. **Ranking-Listen und Scraper für alle Listen-Firmen:** Listen anhand realer Rankings festlegen (Recherche läuft seit 2026-11-09), Listen in der Datenbank, 4-Wochen-Check, Filter „Liste“, automatische Erkennung des Bewerbermanagement-Systems und Anbindung (rund 1000 Firmen), Zusatzfirmen pro Nutzer mit Admin-Freigabe (4.8), Firmendaten anreichern, Gesundheitscheck mit Issue, Telegram und Selbstreparatur, Digest, Beobachtung von Wunscharbeitgebern. Offen: TK (Stellen nur per „Mehr laden“, bräuchte Playwright).
5. **KI-Auswertung und Filter:** Extraktion aus Anzeigen per Groq (Gratis-Tarif), alle Filter aus 4.1, Suchprofile, Facetten, Muss- und Soll-Kriterien.
6. **Passung und Analyse:** CV-Abgleich auf der Detailseite (Anforderungen, die mein CV abdeckt, fett; nicht abgedeckte rot) und Empfehlung eines meiner CVs pro Stelle, beides per KI über den Abo-Token; dazu „Wichtige Punkte“ nach Bedeutung statt nach Wortanfang, nach Bedeutung statt Wortgleichheit (Wunsch 2026-11-08). Dafür das günstigste Modell (Haiku), um das Abo-Kontingent zu schonen; ein größeres Modell nur, wenn Stichproben zeigen, dass Haiku zu oft danebenliegt. Passungs-Score, Skill-Lücken, Gehaltsbenchmark, Pendelzeit, Sofort-Alarm, monatliche Übersichten.

**Backlog (noch keiner Phase zugeordnet):**
- **Live gehen (Freunde oder öffentlich), Entscheidung 2026-11-10:** Vorerst nutze nur ich Jobradar. Vor dem Einladen von Freunden oder einer Veröffentlichung:
  - Erlaubnis-E-Mails an die Ranking-Herausgeber schicken (7 nötig, 1 optional; Vorlage und Empfänger in `docs/ranking-legal.md`, Abschnitt 5). Nur Listen mit schriftlicher Zusage dürfen dann gezeigt werden.
  - Den ersten Freund als Google-Testnutzer eintragen (README „Freunde einladen“), dazu das Mail-Paket prüfen.
- **Mail-Paket:**
  - eigene Domain
  - Mail-Dienst, z. B. Resend (gratis)
  - Google-App veröffentlichen, damit „Link teilen, jeder kommt rein“ ohne Testnutzer klappt
  - dabei entscheiden: neue Nutzer sofort drin oder erst nach Freigabe?
  - spätestens nötig, wenn es Richtung 20 Nutzer geht
- **Dokumente klären:** Wozu dienen hochgeladene Dokumente, wenn man sich nicht über die Website bewirbt? Bis dahin ist der Reiter ausgeblendet (Entscheidung 2026-11-08).
- **Bewerbungsformular neu definieren:**
  - welche Felder es gibt,
  - was automatisch aus der Stelle übernommen wird,
  - welche Felder erst in späteren Bewerbungsphasen erscheinen,
  - kein manuelles Abtippen bekannter Stellen.
  - Eigene Fragerunde in einer späteren Phase.
- **Login für Freunde:** E-Mail und Passwort zusätzlich zu Google (braucht das Mail-Paket).
- **„In Jobradar speichern“ per Lesezeichen (Wunsch 2026-11-12, aus der Wettbewerbsanalyse):** Ein Browser-Lesezeichen, das auf jeder Stellenseite die Adresse an „Manuell anlegen“ übergibt. Kein Plugin, keine fremden Daten.
- **Geschätztes Gehalt für jede Stelle (Wunsch 2026-11-12, Phase 4 bei „Passung und Analyse“):** Spanne je Stelle, möglichst stellen-, firmen- und landesspezifisch, mit Quellenangabe („geschätzt aus …“) und klar getrennt von Gehältern aus der Anzeige. Reihenfolge der Quellen: (1) Anzeige selbst, (2) andere Anzeigen derselben Firma, (3) Anzeigen mit ähnlichem Titel im selben Land, (4) Entgeltatlas der Bundesagentur für Arbeit nach Beruf und Region. kununu, Glassdoor und levels.fyi nur als Link (Nutzungsbedingungen verbieten automatisches Auslesen). Vor dem Bau prüfen: Stand der deutschen Umsetzung der EU-Entgelttransparenzrichtlinie (Gehaltsspannen in Anzeigen).
- **Nachweis der Eigenbemühungen (nur bei Bedarf):** Export aller Bewerbungen für die Arbeitsagentur (Datum, Firma, Stelle, Weg, Ergebnis) als PDF/CSV. Die Daten liegen im Tracker vor; aktuell kein Thema für mich.
- **Automatisch bewerben (Wunsch 2026-11-12, später bewerten):** Bots wie LazyApply schicken Bewerbungen selbst ab. Vor einer Entscheidung prüfen: Nutzungsbedingungen der ATS und Jobbörsen (Kontosperren), Qualität, Datenschutz, Regel 5 „legal und fair“.
- **E-Mail-Registrierung absichern:** Der Knopf „Registrieren“ (E-Mail und Passwort) ist bis zum Mail-Paket bewusst offen (Entscheidung 2026-11-08). Dann: sperren (Hook, der neue E-Mail-Registrierungen ablehnt) oder mit Bestätigungsmail absichern.

---

## 7. Arbeitsweise

**Installierte Skills:**

| Skill | Wofür |
|---|---|
| **Superpowers** | Hauptmethode für Planen, Umsetzen in kleinen Schritten, Testen und Fehlersuche |
| **grill-me / grilling** | Anforderungen klären, bevor geplant wird. Die übrigen Matt-Pocock-Skills nicht verwenden. |
| **Karpathy** | nachfragen statt annehmen, einfache Lösungen, nur Nötiges ändern |
| **Ponytail** | Code klein halten; nach größeren Änderungen `/ponytail-review` |
| **I have ADHD** | kurzer, handlungsorientierter Antwortstil |
| **webapp-testing** (Anthropic) | **Standard zum Testen der Website** (Entscheidung 2026-11-12): wiederholbare Klicktest-Skripte in Python mit Prüfungen, Wegwerf-Konto `…@example.com` und Abgleich in der Datenbank. Läuft mit dem installierten Chrome (`channel="chrome"`). |
| **playwright-cli** (Microsoft) | Nur zum schnellen Nachsehen und Nachstellen eines gemeldeten Fehlers, Schritt für Schritt. Immer aus einem Ordner außerhalb des Repos starten; sein Arbeitsordner `.playwright-cli/` steht in `.gitignore`. |

**Nicht installiert:** Firecrawl. Playwright ist nur zum Testen der Website installiert; im Scraper gilt weiter Abschnitt 9.
- Firecrawl nur nach meiner Zustimmung, weil es Guthaben kostet.
- Für Recherchen nutzt du die eingebaute Websuche.

**Ablauf pro Phase:**
1. **Klären** mit grill-me
2. **Planen:** Der Plan liegt in `docs/plans/<datum>-<thema>.md`, in Schritten, die jeder für sich testbar sind.
3. **Freigabe:** Ich bestätige den Plan, bevor Code entsteht.
4. **Umsetzen:** mit Helfern; jeder Schritt wird gebaut, geprüft, getestet und committet.
5. **Prüfen:** Tests, bei Website-Änderungen durchklicken, `/ponytail-review`. Beim Testen: **Screenshots nur bei fehlgeschlagenen Prüfungen.**
6. **Abschluss:** `docs/STATUS.md` aktualisieren, bei Bedarf auch diese Datei. Mir in wenigen Sätzen sagen, was jetzt geht und was ich tun muss.

**Bei Fehlern:** Ich beschreibe, was passiert ist, oder kopiere die Meldung. Du suchst systematisch die Ursache, bevor du etwas änderst, und erklärst sie mir in einem Satz.

**Hochladen auf GitHub** (Push) und das Übernehmen in `main` (Merge) nur nach meiner Zustimmung.

---

## 8. Projekt-Gedächtnis

- `docs/STATUS.md`: Was funktioniert, was in Arbeit ist, bekannte Probleme, nächster Schritt. **Zu Beginn jeder Sitzung lesen.**
- `docs/ENTSCHEIDUNGEN.md`: jede Entscheidung mit Datum und einem Satz Begründung.
- `docs/plans/`: die Pläne.
- `data/kategorien.md`: die feste Kategorienliste.

---

## 9. Scraping-Strategie (Reihenfolge einhalten)

1. **Öffentliche Schnittstelle des Bewerbermanagement-Systems (ATS),** z. B. Greenhouse, Ashby, Personio, Lever, SmartRecruiters oder Workday. Pro ATS-Typ gibt es **einen** wiederverwendbaren Adapter. `ats_typ` und `ats_id` stehen in `data/companies.csv`.
2. **Statisches HTML** parsen.
3. **Playwright,** nur wenn die Stellen erst nach JavaScript erscheinen.
4. **Firecrawl,** nur als letzter Ausweg und nur nach meiner Zustimmung, mit einer Schätzung des monatlichen Verbrauchs.

Dazu gilt:
- Für **offene Stellen** wird der vollständige Anzeigentext gespeichert. Er wird für den Snapshot, den Hash und die KI-Auswertung gebraucht.
- **Geschlossene Stellen:**
  - Gibt es dazu eine Bewerbung (auch „Gemerkt“), bleibt die Stelle vollständig erhalten.
  - Bei allen anderen wird der Text sofort gelöscht und die Stelle ausgeblendet. Es bleibt nur eine Mini-Notiz mit Firma, Titel, erstmals und zuletzt gesehen. Sie hält das echte Erstdatum fest, falls die Anzeige wieder auftaucht.
- Jeder neue Adapter wird an mindestens 2 echten Firmen getestet. Du zeigst mir die Anzahl der Stellen und 3 Beispieltitel.

---

## 10. Code- und Repo-Regeln

- Python für Scraper und Skripte, mit möglichst wenigen Abhängigkeiten. Bevor ein fremdes Paket dazukommt, sag kurz, wofür es gebraucht wird und ob es gepflegt wird.
- Kleine, verständliche Dateien. Keine Abstraktionen auf Vorrat.
- Tests für jeden Adapter, mit gespeicherten Beispielantworten statt Internetzugriff.
- Kleine Commits mit deutscher Nachricht. Kein Force-Push, die Historie wird nicht umgeschrieben.
- Keine neuen kostenpflichtigen Dienste und keine neuen Konten bei Drittanbietern ohne meine Zustimmung.

## 11. Wann eine Aufgabe fertig ist

- Du hast es selbst ausgeführt und getestet. „Sollte funktionieren“ reicht nicht.
- Die Tests sind grün.
- Es sind keine Geheimnisse im Code.
- `docs/STATUS.md` ist aktuell.
- Du hast mir gesagt, was jetzt geht, was ich tun muss und was der nächste Schritt ist.
