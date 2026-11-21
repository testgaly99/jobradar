"""Telegram-Nachrichten ohne sensible Protokollausgaben; Konfiguration erst beim Aufruf."""
import os

import requests

_UNSET = object()
GRENZE = 4096


def _stuecke(text):
    rest = text
    while rest:
        einheiten, ende = 0, 0
        for i, zeichen in enumerate(rest):
            breite = 2 if ord(zeichen) > 0xffff else 1
            if einheiten + breite > GRENZE:
                break
            einheiten += breite
            ende = i + 1
        if ende < len(rest):
            zeile = rest.rfind('\n', 0, ende)
            if zeile >= 0:
                ende = zeile + 1
        yield rest[:ende]
        rest = rest[ende:]


def sende(text, post=None, token=_UNSET, chat=_UNSET):
    """Ein explizit fehlender Empfänger fällt niemals auf den Systemchat zurück."""
    token = os.environ.get('TELEGRAM_BOT_TOKEN') if token is _UNSET else token
    chat = os.environ.get('TELEGRAM_CHAT_ID') if chat is _UNSET else chat
    if not token or not chat:
        print('Hinweis: Telegram nicht eingerichtet; nichts gesendet.')
        return False
    if not isinstance(text, str) or not text:
        return False
    try:
        for stueck in _stuecke(text):
            r = (post or requests.post)(f'https://api.telegram.org/bot{token}/sendMessage',
                json={'chat_id': chat, 'text': stueck, 'disable_web_page_preview': True}, timeout=15)
            if not r.ok or r.json().get('ok') is not True:
                print('Hinweis: Telegram-Versand fehlgeschlagen.')
                return False
        return True
    except Exception:
        # RequestException kann die vollständige URL mit Bot-Token enthalten.
        print('Hinweis: Telegram-Versand fehlgeschlagen.')
        return False
