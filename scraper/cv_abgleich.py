"""Plan 6a, Task 4: nächtlicher CV-Abgleich für Admin-Konten über Claude Code (Abo).

Regeln (docs/plans/2026-11-16-cv-abgleich.md, A5–A7): nichts erfinden; jeder Beleg steht buchstabengetreu im
CV-Text genau der genannten Version; Rot nur mit wörtlichem negativem Beleg und Begründung; fehlende Erwähnung,
leerer CV oder unbrauchbare Antwort ergeben Gelb. Log nur Zahlen, nie CV-, Anzeigen- oder Antworttext.
"""

FARBEN = {'gruen': {'belegt'}, 'gelb': {'teilweise', 'nicht_belegt', 'nicht_pruefbar'}, 'rot': {'nicht_erfuellt'}}
GELB_NICHT_PRUEFBAR = {'farbe': 'gelb', 'grund': 'nicht_pruefbar', 'beleg': None, 'begruendung': 'konnte nicht geprüft werden'}


def _text(x):
    return x if isinstance(x, str) else ''


def profil_pruefen(aussagen, cv_text):
    """Nur Aussagen behalten, deren Beleg wörtlich im CV-Text steht (A5)."""
    if not isinstance(aussagen, list):
        return []
    return [{'aussage': a['aussage'], 'beleg': a['beleg']} for a in aussagen
            if isinstance(a, dict) and _text(a.get('aussage')).strip() and _text(a.get('beleg')).strip()
            and a['beleg'] in cv_text]


def _eintrag(e, cv_text):
    farbe, grund = e.get('farbe'), e.get('grund')
    beleg, begruendung = _text(e.get('beleg')) or None, _text(e.get('begruendung')).strip()
    if farbe not in FARBEN or grund not in FARBEN[farbe]:
        return dict(GELB_NICHT_PRUEFBAR)
    if beleg is not None and beleg not in cv_text:
        return dict(GELB_NICHT_PRUEFBAR)  # erfunden oder aus einer anderen Version (A7)
    if farbe == 'gruen' and not beleg:
        return dict(GELB_NICHT_PRUEFBAR)
    if farbe == 'rot' and (not cv_text.strip() or not beleg or not begruendung):
        return dict(GELB_NICHT_PRUEFBAR)  # Rot nur mit negativem Beleg und Begründung (A6)
    return {'farbe': farbe, 'grund': grund, 'beleg': beleg, 'begruendung': begruendung}


def antwort_pruefen(antwort, anforderungen, cv_texte):
    """Claude-Antwort [{id, cv, farbe, grund, beleg, begruendung}] -> {anforderung: {cv: eintrag}}; Lücken -> Gelb."""
    gueltig = {}
    for e in antwort if isinstance(antwort, list) else []:
        if isinstance(e, dict) and e.get('cv') in cv_texte:
            gueltig[(e.get('id'), e['cv'])] = _eintrag(e, cv_texte[e['cv']])
    return {a['id']: {cv: gueltig.get((a['id'], cv), dict(GELB_NICHT_PRUEFBAR)) for cv in cv_texte} for a in anforderungen}
