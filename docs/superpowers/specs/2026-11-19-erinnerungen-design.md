# Erinnerungen – Design (kurz)

Stand 2026-11-19 · Fragen Q214–Q220 · Bau durch Codex nach Phase 4f (Telegram-Digest) und nach dem Bewerbungsformular (Nr. 11b, Angebotskasten), Migration **027**.

## Wozu

Keine Bewerbung soll einschlafen, und keine Angebotsfrist soll verstreichen. Beides erscheint dort, wo heute schon Fälliges steht („Diese Woche fällig“), für den Admin zusätzlich per Telegram (Q216).

## Entscheidungen

| Was | Quelle |
|---|---|
| **Nachfassen:** einmal, wenn eine Bewerbung seit **30 Tagen** (Standard) im Status „Beworben“ ohne Statuswechsel ist; danach nie wieder für diese Bewerbung | Q219, Q220 |
| Tage in den Einstellungen änderbar (7–90), Erinnerung abschaltbar | Q220 |
| **Antwortfrist:** neues Feld „Antwort bis“ im Angebotskasten; Erinnerung 2 Tage vorher; am Fristtag Telegram an den Admin | Q217 |
| Kanal: alle „Diese Woche fällig“; Admin zusätzlich im täglichen Telegram-Digest (4f) | Q216 |
| Knopf **„Nachfass-Mail mit Claude“** am Nachfass-Eintrag: öffnet eigenes claude.ai mit Firma, Stelle, Bewerbungsdatum, Ansprechpartner (wie Runde 1) | Q218 |

## Bauweise

Erinnerungen werden **berechnet**, nicht gespeichert: `wochenListe` (`web/lib/woche.ts`, Daten aus `ladeWoche` in `web/lib/tracker-daten.ts`, angezeigt in `web/app/bewerbungen/woche.tsx`) bekommt zwei neue Arten. So verschwinden sie von selbst, sobald sich der Status ändert. Gespeichert wird nur, dass eine Nachfass-Erinnerung erledigt ist, damit sie „einmal, dann nie wieder“ bleibt. (Einzige sinnvolle Bauweise: als echte „nächste Schritte“ gespeichert, müssten sie bei jeder Antwort wieder gelöscht werden.)

## Entwurf

- **Migration 027:** `erinnerung_einstellungen(owner_id pk → auth.users on delete cascade, nachfass_an boolean not null default true, nachfass_tage integer not null default 30 check between 7 and 90)`, RLS eigene Zeile; `applications` + `nachfass_erledigt_am date`, `angebot_antwort_bis date`. Fehlt die Einstellungszeile, gelten die Standardwerte.
- **Nachfassen fällig**, wenn: Einstellung an; Status `beworben`; `nachfass_erledigt_am` leer; Datum des letzten Statuswechsels auf `beworben` (aus `application_events`, sonst `beworben_am`) + `nachfass_tage` ≤ heute + 7. Eintrag: „Nachfassen ({n} Tage ohne Antwort)“ mit „Erledigt“ (setzt `nachfass_erledigt_am`) und „Mail mit Claude“. Überfällig wie bisher markiert.
- **Antwortfrist fällig**, wenn Status `angebot`, `angebot_antwort_bis` gesetzt, Frist − 2 Tage ≤ heute + 7; Eintrag „Antwort aufs Angebot bis {Datum}“; verschwindet, sobald der Status nicht mehr `angebot` ist.
- **Einstellungen (Konto → „Erinnerungen“):** Schalter „Ans Nachfassen erinnern“, Feld „nach [30] Tagen ohne Antwort“.
- **Telegram (nur Admin, 4f-Digest):** Abschnitt „Fällig“ mit Nachfassen und Antwortfristen dieses Tages; am Fristtag eigener Satz „Heute Antwortfrist: {Firma}“. Firmenname im Telegram wie bei Phase 3 erlaubt (Q152); keine anderen Inhalte.
- **„Mail mit Claude“:** Auftrag fest: „Schreibe eine kurze, höfliche Nachfass-Mail auf Deutsch zu meiner Bewerbung. Frage nach dem Stand, ohne zu drängen.“ + Firma, Stelle, Bewerbungsdatum, Ansprechpartner mit Anrede (Runde 1); Link `https://claude.ai/new?q=` wie in Runde 1 (Funktion `claudeAuftrag` wiederverwenden).

## Nicht-Ziele

Zweite Nachfass-Erinnerung (Q220); Abschließen-Vorschlag „keine Antwort“; Erinnerungen per E-Mail (Mail-Paket); Telegram für Freunde.

## Tests

- Fälligkeit Nachfassen: genau an Tag 30 (mit Vorschau 7 Tage), mit eigener Tageszahl, ausgeschaltet → nie, erledigt → nie wieder, Statuswechsel auf `im_gespraech` → weg, Status zurück auf `beworben` (neues Ereignis) → zählt ab dem neuen Wechsel, aber nur wenn noch nicht erledigt.
- Antwortfrist: 2 Tage vorher, Status geändert → weg, ohne Frist → nichts.
- Digest-Text mit Fälligem; Fristtag-Satz.
- Einstellungen: 6 und 91 Tage abgelehnt.

## Entscheidungen von Claude (zum Gegenlesen)

1. Gezählt wird ab dem letzten Wechsel auf „Beworben“ (nicht ab dem eingetragenen Bewerbungsdatum, falls das später nachgetragen wurde).
2. „Erledigt“ beim Nachfassen gilt für immer für diese Bewerbung (Q220 „dann gar nicht mehr“).
3. Antwortfrist-Erinnerung 2 Tage vorher, zusätzlich Telegram am Fristtag; Freunde sehen sie nur auf der Website.
4. Die Mail-Vorlage für Claude ist fest formuliert (oben).
5. CLAUDE.md 4.4 „Nachfassen nach 14 Tagen“ wird zu „einmal nach 30 Tagen, einstellbar, abschaltbar“.
