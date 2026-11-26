"""Plan 6a, Task 4: nächtlicher CV-Abgleich für Admin-Konten über Claude Code (Abo).

Regeln (docs/plans/2026-11-16-cv-abgleich.md, A5–A7): nichts erfinden; jeder Beleg steht buchstabengetreu im
CV-Text genau der genannten Version; Rot nur mit wörtlichem negativem Beleg und Begründung; fehlende Erwähnung,
leerer CV oder unbrauchbare Antwort ergeben Gelb. Log nur Zahlen, nie CV-, Anzeigen- oder Antworttext.
"""
import hashlib
import json
import os
import re
import shutil
import tempfile
import time
from datetime import date
from pathlib import Path

from scraper import claude_cli, cv_stufe1
from scraper.claude_cli import UngueltigeAntwort

MAX_STELLEN = 50   # Stellen je Nacht und Konto (Plan, Q30); am Haltepunkt bestätigen oder senken
BUENDEL = 5        # Stellen je Claude-Aufruf
SCHAETZ_BUDGET_S = 900  # Sekunden je Konto für die Schätzung ohne Claude
PROMPT = Path(__file__).with_name('cv_prompt.md').read_text(encoding='utf-8')

FARBEN = {'gruen': {'belegt'}, 'gelb': {'teilweise', 'nicht_belegt', 'nicht_pruefbar'}, 'rot': {'nicht_erfuellt'}}
GELB_NICHT_PRUEFBAR = {'farbe': 'gelb', 'grund': 'nicht_pruefbar', 'beleg': None, 'begruendung': 'konnte nicht geprüft werden'}

# Nur die aktuelle Fassung des Admin-Einwilligungstexts zählt (Q275); ändert sich der Text, wird übersprungen.
EINWILLIGUNG_FASSUNG = json.loads((cv_stufe1.ROOT / 'web/lib/cv-einwilligung.json').read_text(encoding='utf-8'))['admin']['fassung']


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


def _abschnitt(name):
    teile = re.split(r'^## ', PROMPT, flags=re.M)
    return next(x.split('\n', 1)[1].strip() for x in teile if x.startswith(name))


def text_lesen(datei):
    """Textebene aus PDF (pypdf) oder Word (python-docx); sonst leer (dann Scan über Claude)."""
    datei = Path(datei)
    try:
        if datei.suffix.lower() == '.pdf':
            from pypdf import PdfReader
            return '\n'.join((s.extract_text() or '') for s in PdfReader(str(datei)).pages).strip()
        if datei.suffix.lower() == '.docx':
            import docx
            return '\n'.join(p.text for p in docx.Document(str(datei)).paragraphs).strip()
    except Exception:
        return ''
    return ''


def offen(kandidaten, vorhanden, grenze):
    """Nur Stellen mit Anforderungen und ohne gültiges Ergebnis (fehlend, browser-vorlaeufig oder schaetzung), höchstens grenze."""
    gueltig = {(v.get('job_id'), v.get('application_id')) for v in vorhanden if v.get('weg') not in ('browser-vorlaeufig', 'schaetzung')}
    aus, gesehen = [], set()
    for k in kandidaten:
        schluessel = (k.get('job_id'), k.get('application_id'))
        if k.get('anforderungen') and schluessel not in gueltig and schluessel not in gesehen:
            gesehen.add(schluessel)
            aus.append(k)
    return aus[:grenze]


def _hash(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def _cv_text(doc, owner, db, frage):
    """Vorhandenen (ggf. korrigierten) Text nutzen; sonst Datei kurz holen, auslesen, Scan über Claude, Datei löschen."""
    if doc.get('cv_text') is not None:
        return doc['cv_text']
    ordner = Path(tempfile.mkdtemp(prefix='cv-'))
    try:
        datei = ordner / ('cv' + (Path(doc.get('storage_pfad') or '').suffix or '.pdf'))
        datei.write_bytes(db.lade_datei(doc['storage_pfad']))
        text = text_lesen(datei)
        if not text:
            try:
                antwort = frage(_abschnitt('Scan'), bilder=[datei])
                text = antwort.get('text', '').strip() if isinstance(antwort, dict) else ''
            except UngueltigeAntwort:
                text = ''
    finally:
        shutil.rmtree(ordner, ignore_errors=True)
    eintrag = {'text': text, 'hash': _hash(text), 'herkunft': 'ausgelesen' if text else 'leer'}
    db.speichere_cv_text(doc['id'], owner, text, eintrag['herkunft'], eintrag['hash'])
    return eintrag


def _profil(doc, cv, owner, db, frage):
    if not cv['text'].strip():
        return []
    if doc.get('profil') and doc['profil'].get('text_hash') == cv['hash']:
        return doc['profil']['aussagen']
    try:
        aussagen = profil_pruefen(frage(_abschnitt('Profil') + '\n<cv>\n' + cv['text'] + '\n</cv>'), cv['text'])
    except UngueltigeAntwort:
        aussagen = []
    db.speichere_profil(doc['id'], owner, cv['hash'], aussagen)
    return aussagen


def _farbe(b):
    if b['stufe'] == 'sicher':
        return {'farbe': 'gruen', 'grund': 'belegt', 'beleg': b['beleg'], 'begruendung': ''}
    if b['stufe'] == 'nicht_belegt':
        return {'farbe': 'gelb', 'grund': 'nicht_belegt', 'beleg': None, 'begruendung': 'noch nicht belegt'}
    return None


def _stufe1(stelle, profile, docs, einbetten, cache):
    anf = stelle['anforderungen']
    q = einbetten([a['text'] for a in anf], 'query')
    bewertungen = {}
    for d in docs:
        profil = profile[d['id']]
        if d['id'] not in cache:
            cache[d['id']] = einbetten([p['beleg'] for p in profil], 'passage') if profil else []
        aehnlich = [[sum(x * y for x, y in zip(qa, pb)) for pb in cache[d['id']]] for qa in q]
        bewertungen[d['id']] = cv_stufe1.bewerte(anf, profil, aehnlich)
    standard = next((d['id'] for d in docs if d.get('standard')), None)
    return bewertungen, cv_stufe1.waehle(bewertungen, anf, standard)


def passung_sortwert(anforderungen, je_cv, empfohlen):
    """Kleiner ist besser. je_cv: {anforderung: {cv: eintrag}}; je CV 1000*Muss-Rot + 100*(Gelb + 1,5*Soll-Rot)/n, bester CV."""
    n = len(anforderungen)
    if not n or not empfohlen:
        return None
    werte = []
    for cv in empfohlen:
        muss_rot = gelb = soll_rot = 0
        for a in anforderungen:
            f = je_cv[a['id']][cv]['farbe']
            if f == 'rot':
                muss_rot, soll_rot = muss_rot + bool(a.get('muss', True)), soll_rot + (not a.get('muss', True))
            elif f == 'gelb':
                gelb += 1
        werte.append(1000 * muss_rot + round(100 * (gelb + 1.5 * soll_rot) / n))
    return min(werte)


def _speichere(db, owner, stelle, bewertungen, empfohlen, claude, docs, cvs, weg='claude'):
    anforderungen = []
    for a in stelle['anforderungen']:
        je_cv = {}
        for cv in empfohlen:
            b = next(x for x in bewertungen[cv] if x['id'] == a['id'])
            je_cv[cv] = _farbe(b) or claude.get(a['id'], {}).get(cv) or dict(GELB_NICHT_PRUEFBAR)
            if weg == 'schaetzung':  # Spec: Schätzungen speichern nur Farbe, keine Belegtexte
                je_cv[cv] = {**je_cv[cv], 'beleg': None}
        anforderungen.append({'id': a['id'], 'je_cv': je_cv})
    ziel = {'job_id': stelle['job_id']} if stelle.get('job_id') else {'application_id': stelle['application_id']}
    sortwert = passung_sortwert(stelle['anforderungen'], {a['id']: a['je_cv'] for a in anforderungen}, empfohlen)
    db.speichere_ergebnis(owner, ziel, weg=weg, passung_sortwert=sortwert, empfohlen=empfohlen, geprueft=[d['id'] for d in docs],
                          anforderungen=anforderungen, anforderungs_hash=stelle['anforderungs_hash'],
                          cv_hashes={d['id']: cvs[d['id']]['hash'] for d in docs})


def _konto(owner, db, frage, einbetten, z, nur_schaetzen=False):
    if not db.hat_cv_einwilligung(owner, EINWILLIGUNG_FASSUNG):
        z['hinweise'].append('übersprungen: keine Einwilligung')
        return
    docs = db.cv_dokumente(owner)
    if not docs:
        z['hinweise'].append('übersprungen: kein CV')
        return
    cvs = profile = None
    cache = {}
    fehler = None
    if not nur_schaetzen:
        try:
            cvs = {d['id']: _cv_text(d, owner, db, frage) for d in docs}
            profile = {d['id']: _profil(d, cvs[d['id']], owner, db, frage) for d in docs}
            stellen = db.stellen_fuer_abgleich(owner, z['grenze'])[:z['grenze']]
            warteschlange = []
            for i, s in enumerate(stellen):
                bewertungen, empfohlen = _stufe1(s, profile, docs, einbetten, cache)
                grenz = {}
                for cv in empfohlen:
                    ids = [b['id'] for b in bewertungen[cv] if b['stufe'] == 'grenzfall']
                    if ids:
                        grenz[cv] = [{'id': a['id'], 'text': a['text']} for a in s['anforderungen'] if a['id'] in ids]
                if grenz:
                    warteschlange.append((i, s, bewertungen, empfohlen, grenz))
                else:
                    _speichere(db, owner, s, bewertungen, empfohlen, {}, docs, cvs)
                    z['stellen'] += 1
            for start in range(0, len(warteschlange), BUENDEL):
                buendel = warteschlange[start:start + BUENDEL]
                daten = [{'stelle': i, 'grenzfaelle': grenz, 'belege': {cv: [p['beleg'] for p in profile[cv]] for cv in grenz}}
                         for i, _, _, _, grenz in buendel]
                z['aufrufe'] += 1
                try:
                    antwort = frage(_abschnitt('Grenzfaelle') + '\n<daten>' + json.dumps(daten, ensure_ascii=False) + '</daten>')
                except UngueltigeAntwort:
                    antwort, z['ungueltig'] = [], z['ungueltig'] + 1
                for i, s, bewertungen, empfohlen, grenz in buendel:
                    eigene = [e for e in antwort if isinstance(e, dict) and e.get('stelle') == i] if isinstance(antwort, list) else []
                    ids = {g['id'] for v in grenz.values() for g in v}
                    claude = antwort_pruefen(eigene, [a for a in s['anforderungen'] if a['id'] in ids],
                                             {cv: cvs[cv]['text'] for cv in grenz})
                    _speichere(db, owner, s, bewertungen, empfohlen, claude, docs, cvs)
                    z['stellen'] += 1
        except (claude_cli.AboLimit, claude_cli.ClaudeFehler) as e:
            fehler = e  # Schätzung (ohne Claude) läuft trotzdem; Ausnahme wird danach erneut geworfen
    if cvs is None or profile is None:  # Claude-Teil übersprungen oder früh gescheitert: nur CVs mit gespeichertem Text und passendem Profil
        cache = {}
        docs = [d for d in docs if d.get('cv_text') and d.get('profil') and d['profil'].get('text_hash') == d['cv_text']['hash']]
        cvs = {d['id']: d['cv_text'] for d in docs}
        profile = {d['id']: d['profil']['aussagen'] for d in docs}
    if docs:
        try:  # Schätzung darf den Lauf nie abbrechen; im Log nur der Fehlertyp
            _schaetzen(owner, db, einbetten, docs, profile, cvs, cache, z)
        except Exception as e:
            z['hinweise'].append(f'Schätzung abgebrochen ({type(e).__name__})')
    else:
        z['hinweise'].append('Schätzung übersprungen: Profil fehlt')
    if fehler:
        raise fehler


def _schaetzen(owner, db, einbetten, docs, profile, cvs, cache, z, uhr=None):
    """Stufe 1 allein (sicher -> grün, sonst gelb, nie rot) für alle übrigen sichtbaren Stellen, im Zeitbudget."""
    uhr = uhr or time.monotonic
    start = uhr()
    for s in db.stellen_fuer_schaetzung(owner, {d['id']: cvs[d['id']]['hash'] for d in docs}):
        if uhr() - start >= SCHAETZ_BUDGET_S:
            break
        bewertungen, empfohlen = _stufe1(s, profile, docs, einbetten, cache)
        _speichere(db, owner, s, bewertungen, empfohlen, {}, docs, cvs, weg='schaetzung')
        z['geschaetzt'] += 1


def _grenze():
    """Probelauf von Hand (Haltepunkt b): CV_MAX_STELLEN darf die Grenze nur senken, nie erhöhen."""
    wert = os.environ.get('CV_MAX_STELLEN', '')
    return min(int(wert), MAX_STELLEN) if wert.isdigit() and int(wert) > 0 else MAX_STELLEN


def main(db=None, frage=None, einbetten=None, heute=None):
    """Immer Exitcode 0; Abbruch am Abo-Limit oder bei Fehlern von Claude Code, Rest in der nächsten Nacht."""
    if db is None:
        from scraper import db
    frage = frage or claude_cli.frage
    einbetten = einbetten or cv_stufe1.einbetten
    tag = date.fromisoformat(heute) if heute else date.today()
    z = {'stellen': 0, 'aufrufe': 0, 'ungueltig': 0, 'geschaetzt': 0, 'hinweise': [], 'grenze': _grenze()}
    admins = db.admin_ids()
    if admins:  # Reihenfolge wechselt täglich, damit bei knappem Kontingent nicht immer dasselbe Konto zu kurz kommt
        k = tag.toordinal() % len(admins)
        admins = admins[k:] + admins[:k]
    nur_schaetzen = False  # nach Limit/Fehler: restliche Konten nur noch kostenlos schätzen
    for admin in admins:
        try:
            _konto(admin['user_id'], db, frage, einbetten, z, nur_schaetzen)
        except (claude_cli.AboLimit, claude_cli.ClaudeFehler) as e:
            if not nur_schaetzen:
                z['hinweise'].append('Abbruch: Limit' if isinstance(e, claude_cli.AboLimit) else 'Abbruch: Fehler')
            nur_schaetzen = True
    print(f"CV-Abgleich: {z['stellen']} Stellen, {z['aufrufe']} Aufrufe, {z['ungueltig']} ungültige Antworten, {z['geschaetzt']} geschätzt"
          + ''.join('; ' + h for h in z['hinweise']))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
