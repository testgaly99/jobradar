"""Tägliche neue Stellen je Admin, stets vor Auswahl und Zählung nach Sichtbarkeit filtern."""
from datetime import date, timedelta
import os
import re
from urllib.parse import quote, urlsplit

from scraper import db, telegram


def passt(stelle, wunsch, woerter):
    if stelle.get('unternehmen') in wunsch:
        return True
    titel = stelle.get('titel') or ''
    return any(w.strip() and re.search(r'(?<!\w)' + re.escape(w.strip()), titel, re.I)
               for w in woerter if isinstance(w, str))


def text(treffer, rest, basis):
    basis = basis.rstrip('/')
    zeilen = [f"{s['unternehmen']} – {s['titel']}\n{basis}/stellen/{quote(s['id'], safe='')}" for s in treffer[:20]]
    rest = max(0, rest) + max(0, len(treffer)-20)
    if rest:
        zeilen.append(f'{rest} weitere neue Stellen: {basis}/stellen')
    return '\n\n'.join(zeilen)


def _basis(wert):
    try:
        u = urlsplit(wert or '')
        return u.scheme == 'https' and bool(u.hostname) and not u.username and not u.password and not u.query and not u.fragment
    except ValueError:
        return False


def main(heute=None):
    heute = heute or date.today().isoformat()
    try:
        basis = os.environ.get('SEITE_URL')
        basis_ok=_basis(basis)
        if not basis_ok:
            print('Hinweis: Digest-Adresse nicht eingerichtet; Fenster bleibt erhalten.')
        laeufe = db.letzte_laeufe(2)
        if not laeufe or laeufe[0].get('stand') != heute:
            print('Hinweis: Kein heutiger Lauf für den Digest; nichts gesendet.')
            return 0
        lauf_id = os.environ.get('GITHUB_RUN_ID')
        if lauf_id and laeufe[0].get('workflow_lauf') != {'id':lauf_id,'versuch':os.environ.get('GITHUB_RUN_ATTEMPT','1')}:
            print('Hinweis: Kein Bericht dieses Workflow-Laufs für den Digest; nichts gesendet.')
            return 0
        vorher = next((b['stand'] for b in laeufe[1:] if b.get('stand', '') < heute),
                      (date.fromisoformat(heute)-timedelta(days=1)).isoformat())
        admins = db.admin_ids()
        if not admins:
            print('Hinweis: Keine Digest-Admins eingerichtet.')
            return 0
        abgeschlossen=(date.fromisoformat(heute)-timedelta(days=1)).isoformat()
        cache={}
        gesendet = 0
        for admin in admins:
            try:
                fenster=db.digest_fenster(admin['user_id'],vorher)
                ab=fenster['ab']
                geliefert=set(fenster['gesendet_ids'])
                if not admin.get('telegram_chat_id') or not basis_ok:
                    continue  # Fenster bleibt auch ohne Versandkonfiguration dauerhaft erhalten.
                if ab not in cache:
                    cache[ab]=db.neue_stellen_seit(ab)
                sichtbar = db.sichtbare_firmen(admin['user_id'])
                eigene = [s for s in cache[ab] if s['unternehmen'] in sichtbar and s['id'] not in geliefert]
                if not eigene:
                    db.digest_erfolg(admin['user_id'],[],abgeschlossen)
                    continue
                wunsch, woerter = db.wunsch_und_stichwoerter(admin['user_id'])
                treffer = [s for s in eigene if passt(s, wunsch, woerter)]
                nachricht = text(treffer, len(eigene)-len(treffer), basis)
                if nachricht and telegram.sende(nachricht, chat=admin['telegram_chat_id']):
                    db.digest_erfolg(admin['user_id'],[s['id'] for s in eigene],abgeschlossen)
                    gesendet += 1
            except Exception:
                print('Hinweis: Ein Digest konnte nicht vollständig abgeschlossen werden.')
        print(f'Digests gesendet: {gesendet}')
    except Exception:
        print('Hinweis: Digest konnte nicht vorbereitet werden.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
