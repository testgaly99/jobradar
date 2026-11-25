"""Lieferkette (Plan 2026-11-25-sicherheit-mittel, Q307): kein Nachtlauf zieht unbemerkt eine neue Version."""
import re
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent


def test_pakete_fest():
    zeilen = [z.split('#')[0].strip() for z in (WURZEL / 'requirements.txt').read_text(encoding='utf-8').splitlines()]
    pakete = [z for z in zeilen if z]
    assert pakete and all(re.fullmatch(r'[A-Za-z0-9_.-]+==[0-9][0-9A-Za-z.]*', z) for z in pakete), pakete


def test_erinnerung_freiwillig_und_ohne_telegram_still(monkeypatch, capsys):
    # Q309: Erinnerung sagt, dass Auslassen nichts kaputt macht; ohne Telegram-Secrets wird nichts gesendet
    from scraper import sicherheit_erinnerung as s
    assert 'freiwillig' in s.text(2) and '2 offene Update-Vorschläge' in s.text(2) and 'Anzahl unbekannt' in s.text(None)
    monkeypatch.delenv('TELEGRAM_BOT_TOKEN', raising=False)
    monkeypatch.delenv('TELEGRAM_CHAT_ID', raising=False)
    assert s.telegram.sende(s.text(0)) is False
    w = (WURZEL / '.github' / 'workflows' / 'sicherheit-erinnerung.yml').read_text(encoding='utf-8')
    assert '|| true' in w and 'contents: read' in w and 'contents: write' not in w


def test_actions_fest():
    for datei in (WURZEL / '.github' / 'workflows').glob('*.yml'):
        for z in re.findall(r'uses:\s*(\S+)', datei.read_text(encoding='utf-8')):
            assert re.search(r'@[0-9a-f]{40}$', z), f'{datei.name}: {z}'
