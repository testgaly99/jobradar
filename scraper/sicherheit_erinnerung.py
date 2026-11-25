"""Monatliche Erinnerung an die freiwillige Sicherheitsprüfung (Q309). Auslassen schadet nie; Fehler brechen nichts ab."""
import sys

from scraper import telegram


def text(offen):
    if offen is None:
        vorschlaege = 'Update-Vorschläge (Anzahl unbekannt)'
    else:
        vorschlaege = f'{offen} offene Update-Vorschläge' if offen else 'keine offenen Update-Vorschläge'
    return ('Jobradar: Die monatliche Sicherheitsprüfung ist fällig (freiwillig). '
            f'Auf GitHub warten {vorschlaege}. Wenn du Zeit hast, schreib Claude „Sicherheitsprüfung“. '
            'Lässt du sie aus, läuft alles weiter wie bisher; die Vorschläge bleiben einfach offen.')


if __name__ == '__main__':
    arg = sys.argv[1].strip() if len(sys.argv) > 1 else ''
    telegram.sende(text(int(arg) if arg.isdigit() else None))
