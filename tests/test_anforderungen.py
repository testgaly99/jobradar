"""Plan 6a, Task 1: Anforderungsliste je Stelle (Review Focus 1)."""
import json
from html import escape
from pathlib import Path

from scraper.abschnitte import abschnitte
from scraper.anforderungen import pruefsumme, zerlege

ROOT = Path(__file__).resolve().parents[1]


def _html(text, titel):
    return ''.join(f'<h3>{escape(z)}</h3>' if z in titel else f'<p>{escape(z)}</p>' for z in text.splitlines() if z.strip())


def test_beispielanzeige_ergibt_die_sechs_anforderungen():
    b = json.loads((ROOT / 'docs/beispiele/cv-abgleich.json').read_text(encoding='utf-8'))
    liste = zerlege(abschnitte(_html(b['anzeige']['text'], {'Aufgaben', 'Anforderungen', 'Bewerbung'})))
    assert [a['text'] for a in liste] == [x['anzeigenpassage']['zitat'] for x in b['anforderungen']]
    assert all(a['muss'] for a in liste)
    assert all(len(a['id']) == 10 for a in liste) and len({a['id'] for a in liste}) == 6


def test_soll_woerter_nur_als_ganzes_wort():
    liste = zerlege([{'titel': 'Dein Profil', 'punkte': ['Power BI wünschenswert', 'Erfahrung mit Plusminus-Rechnung',
                                                           'SQL ist ein Plus', 'SQL ist ein Plus']}])
    assert [(a['text'], a['muss']) for a in liste] == [('Power BI wünschenswert', False),
                                                        ('Erfahrung mit Plusminus-Rechnung', True), ('SQL ist ein Plus', False)]


def test_ohne_anforderungstitel_leere_liste():
    assert zerlege([{'titel': 'Aufgaben', 'punkte': ['Berichte erstellen']}, {'titel': 'Benefits', 'punkte': ['Obst']}]) == []
    assert zerlege([]) == [] and zerlege(None) == []


def test_englische_titel_und_pruefsumme_stabil():
    a = [{'titel': 'What you bring', 'punkte': ['3+ years of Python', 'Nice to have: dbt']}]
    liste = zerlege(a)
    assert [x['muss'] for x in liste] == [True, False]
    assert pruefsumme(liste) == pruefsumme(zerlege(a)) and pruefsumme(liste) != pruefsumme(liste[:1])


def test_regeln_liegen_einmal_fuer_python_und_web_vor():
    r = json.loads((ROOT / 'web/lib/cv-regeln.json').read_text(encoding='utf-8'))
    assert {'oben', 'unten', 'fachbegriff', 'soll_woerter', 'anforderungs_titel'} <= set(r)
    assert {'anforderung', 'profil', 'qualifikation', 'das bringst du mit', 'was du mitbringst', 'requirements',
            'your profile', 'what you bring', 'qualifications'} <= set(r['anforderungs_titel'])
