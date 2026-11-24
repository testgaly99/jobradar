"""Plan 6a, Task 3: Stufe 1 des CV-Abgleichs – Bedeutungsvergleich mit e5-small, ohne KI-Dienst.

`bewerte` und `waehle` sind reine Funktionen (6b prüft dieselben Fälle im Browser); nur `einbetten` braucht das Modell.
Stufe 1 vergibt nie Rot: Strittiges (teilweise, negativer Beleg) bleibt Grenzfall für Claude (Stufe 2).
"""
import json
import re
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODELL = ROOT / 'web/public/modell/e5-small'
REGELN = json.loads((ROOT / 'web/lib/cv-regeln.json').read_text(encoding='utf-8'))


@lru_cache(maxsize=1)
def _modell():
    import onnxruntime
    from tokenizers import Tokenizer
    return Tokenizer.from_file(str(MODELL / 'tokenizer.json')), onnxruntime.InferenceSession(str(MODELL / 'model.onnx'))


def einbetten(texte, art):
    """e5-Konvention: Präfix query:/passage:, Mittelwert über Bausteine, L2-normiert."""
    import numpy as np
    if art not in ('query', 'passage'):
        raise ValueError('art muss query oder passage sein')
    tok, sitzung = _modell()
    aus = []
    for t in texte:
        e = tok.encode(f'{art}: {t}')
        ids = np.array([e.ids], dtype=np.int64)
        maske = np.array([e.attention_mask], dtype=np.int64)
        h = sitzung.run(None, {'input_ids': ids, 'attention_mask': maske, 'token_type_ids': np.zeros_like(ids)})[0][0]
        v = (h * maske[0][:, None]).sum(0) / maske.sum()
        aus.append((v / np.linalg.norm(v)).tolist())
    return aus


def fachbegriffe(text, regeln=REGELN):
    return list(dict.fromkeys(re.findall(regeln['fachbegriff'], text or '')))


def _verneint(text, regeln):
    return {w for w in regeln['verneinung'] if re.search(r'(?<!\w)' + re.escape(w) + r'(?!\w)', text or '', re.I)}


def bewerte(anforderungen, profil, aehnlich, regeln=REGELN):
    """Je Anforderung beste Profilaussage: sicher (≥ oben, alle Fachbegriffe wörtlich, keine neue Verneinung),
    nicht_belegt (< unten) oder grenzfall."""
    ergebnis = []
    for anf, zeile in zip(anforderungen, aehnlich):
        if not profil or not zeile:
            ergebnis.append({'id': anf['id'], 'stufe': 'nicht_belegt', 'beleg': None, 'wert': 0.0})
            continue
        j = max(range(len(zeile)), key=lambda k: zeile[k])
        wert, beleg = float(zeile[j]), profil[j]['beleg']
        if wert < regeln['unten']:
            stufe, beleg = 'nicht_belegt', None
        elif (wert >= regeln['oben']
              and all(f.lower() in beleg.lower() for f in fachbegriffe(anf['text'], regeln))
              and not (_verneint(beleg, regeln) - _verneint(anf['text'], regeln))):
            stufe = 'sicher'
        else:
            stufe = 'grenzfall'
        ergebnis.append({'id': anf['id'], 'stufe': stufe, 'beleg': beleg, 'wert': round(wert, 4)})
    return ergebnis


def waehle(bewertungen, anforderungen, standard_id=None):
    """Beste CV-Version(en): erst mehr sichere Muss-, dann Soll-Anforderungen; zweite Version bei Gleichstand
    oder genau einer Muss-Anforderung Abstand. Gleichstand: Standard-CV zuerst, sonst Reihenfolge der Liste."""
    muss = {a['id']: a.get('muss', True) for a in anforderungen}
    reihe = list(bewertungen)

    def wertung(cv):
        sicher = [b['id'] for b in bewertungen[cv] if b['stufe'] == 'sicher']
        return (sum(muss.get(i, True) for i in sicher), sum(not muss.get(i, True) for i in sicher))

    rang = sorted(reihe, key=lambda cv: (-wertung(cv)[0], -wertung(cv)[1], cv != standard_id, reihe.index(cv)))
    if not rang:
        return []
    beste = rang[:1]
    if len(rang) > 1 and wertung(rang[0])[0] - wertung(rang[1])[0] <= 1:
        beste.append(rang[1])
    return beste
