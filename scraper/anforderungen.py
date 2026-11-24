"""Plan 6a, Task 1: Anforderungs-Abschnitte einer Anzeige in einzelne Punkte zerlegen (ohne KI)."""
import hashlib
import json
import re
from pathlib import Path

REGELN = json.loads((Path(__file__).resolve().parents[1] / 'web/lib/cv-regeln.json').read_text(encoding='utf-8'))
_SOLL = re.compile(r'(?<!\w)(?:' + '|'.join(re.escape(w) for w in REGELN['soll_woerter']) + r')(?!\w)', re.I)


def zerlege(abschnitte):
    """[{"titel", "punkte"}] -> [{"id", "text", "muss"}]; nur Abschnitte mit Anforderungs-Titel, doppelte Punkte einmal."""
    liste, gesehen = [], set()
    for a in abschnitte or []:
        titel = str(a.get('titel', '')).lower()
        if not any(t in titel for t in REGELN['anforderungs_titel']):
            continue
        for punkt in a.get('punkte') or []:
            if not isinstance(punkt, str) or not punkt.strip() or punkt in gesehen:
                continue
            gesehen.add(punkt)
            liste.append({'id': hashlib.sha1(punkt.encode('utf-8')).hexdigest()[:10], 'text': punkt,
                          'muss': not _SOLL.search(punkt)})
    return liste


def pruefsumme(liste):
    return hashlib.sha256(json.dumps(liste, ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()
