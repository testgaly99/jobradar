# Codex-Warteschlange

Claude pflegt diese Liste; Codex arbeitet sie von oben nach unten ab (Regel in `AGENTS.md` Abschnitt 0). Ein Eintrag ist **freigegeben**, wenn der Nutzer in der Codex-Sitzung auf Codex' Vorschlag mit „okay“ (oder „ok“, „ja“, „los“) antwortet. Die Freigabe gilt nur für diesen einen Eintrag und nur bis zu seinem nächsten 🛑 Halte-Punkt.

Status: `offen` (wartet auf „okay“) · `in Arbeit` · `🛑 wartet auf Nutzer/Claude` · `erledigt`.

| Nr | Auftrag | Plan | Status | Halt danach |
|---|---|---|---|---|
| 1 | Link-Schnellstart: komplette Stelle aus Links von Firmen-Karriereseiten | `docs/superpowers/plans/2026-11-18-link-schnellstart.md` | offen | 🛑 Nutzer spielt Migration 012 ein; Claude testet 10 echte Links |
| 2 | Phase 4a: Remote weltweit und Whitelist | `docs/superpowers/plans/2026-11-17-phase4a-remote-whitelist.md` | offen (erst nach Nr. 1 und neuem „okay“) | 🛑 Nutzer spielt Migration 011 ein; Claude prüft live |
| 3 | Phase 4b: Portal-Erkennung aus Link | `docs/plans/2026-11-15-firmenportal-erkennung.md` (Schritte 2–5) | offen (erst nach Nr. 2 und neuem „okay“) | Claude prüft |
| 4 | Sprachniveau: Deutsch-Erkennung, Filter „Mein Deutschniveau“, Anzeige | `docs/superpowers/plans/2026-11-18-sprachniveau.md` | offen (erst nach Nr. 3 und neuem „okay“) | 🛑 Nutzer spielt Migration 013 ein; Claude misst live an 20 Anzeigen |
| 5 | Phase 4c: Firmen aus Ranglisten | `docs/superpowers/plans/2026-11-18-phase4c-firmen-aus-ranglisten.md` (ab Task 1) | wartet auf Claude (Task 0: Lizenzen, Beispieldaten) | 🛑 Nutzer spielt Migration 014 ein; erster echter Abruf mit Claude |

| 6 | Phase 4d: Ranglisten-Sichtbarkeit, Listen von Hand einfügen, Linksammlung | `docs/superpowers/plans/2026-11-18-phase4d-ranglisten-anzeige.md` | offen (erst nach Nr. 5 und neuem „okay“) | 🛑 Nutzer spielt Migration 015 ein und trägt sich als Admin ein; Claude prüft Groq-Extraktion live |
| 7 | Phase 4e: Zusatzfirmen je Nutzer | `docs/superpowers/plans/2026-11-18-phase4e-zusatzfirmen.md` | offen (erst nach Nr. 6 und neuem „okay“) | 🛑 Nutzer spielt Migration 016 ein; Claude prüft mit zwei Wegwerf-Konten |
| 8 | Phase 4f: Gesundheitscheck, Telegram, Digest | `docs/superpowers/plans/2026-11-18-phase4f-ueberwachung-digest.md` | offen (erst nach Nr. 7 und neuem „okay“) | 🛑 Nutzer legt Telegram-Bot und Secrets an, spielt Migration 017 ein |

Weitere Pläne (Phase 4g und Adapter nach der Portal-Messung aus 4c, Phase 6, 5, 3) trägt Claude hier ein, sobald sie geschrieben und vom Nutzer freigegeben sind. Ein Eintrag mit Status „wartet auf Claude“ wird übersprungen; Codex nennt dann den nächsten offenen.
