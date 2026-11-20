import json

import pytest

from scraper import db, kandidaten, run
from scraper.quellen import kandidat
from tests.test_run import firma, stelle, aufbau


def ausgabe():
    return kandidaten.ausgaben([kandidat('A', 'dax')], '2026-11-20')[0]


def test_import_prueft_vor_atomarem_schreiben(monkeypatch):
    calls = []
    def req(method, pfad, **kw):
        calls.append((method, pfad, kw))
        return [{'name': 'A'}] if method == 'GET' else None
    monkeypatch.setattr(db, '_req', req)
    db.importiere_ausgabe(ausgabe())
    assert calls[-1][:2] == ('POST', 'rpc/importiere_ranking_ausgabe')
    assert set(calls[-1][2]['json']['p_daten']) == {'ranking_listen', 'ranking_ausgaben', 'ranking_firmen'}
    calls.clear()
    a = ausgabe(); a['firmen'][0]['unternehmen'] = 'Unbekannt'
    with pytest.raises(ValueError):
        db.importiere_ausgabe(a)
    assert not any(m == 'POST' for m, _, _ in calls)


def test_status_offen_wird_nicht_abgerufen(aufbau):
    f = dict(firma('A'), status='offen')
    calls = []
    d, t = aufbau([f], {'fake': lambda *_args, **_kw: calls.append('ABRUF')})
    b = run.lauf('2026-11-20', d)
    assert not b['firmen'] and not calls
    assert 'Laufzeit:' in (d / 'bericht.md').read_text(encoding='utf-8')


def test_importfehler_nur_eine_datei(aufbau, monkeypatch):
    d, t = aufbau([firma('A')], {'fake': lambda *a, **kw: [stelle('1')]})
    (d / 'ranglisten').mkdir()
    (d / 'ranglisten/a.json').write_text('ungueltig', encoding='utf-8')
    (d / 'ranglisten/b.json').write_text(json.dumps(ausgabe()), encoding='utf-8')
    calls = []
    monkeypatch.setattr(db, 'importiere_ausgabe', lambda a: calls.append(a))
    run.lauf('2026-11-20', d)
    assert len(calls) == 1 and 'A:1' in t['jobs']
    assert 'a.json' in (d / 'bericht.md').read_text(encoding='utf-8')


def test_ohne_migration_014_kein_import(aufbau, monkeypatch):
    d, t = aufbau([firma('A')], {'fake': lambda *a, **kw: [stelle('1')]})
    monkeypatch.setattr(db, 'firmen_quellen_da', lambda: False)
    (d / 'ranglisten').mkdir()
    (d / 'ranglisten/a.json').write_text('{}', encoding='utf-8')
    monkeypatch.setattr(db, 'importiere_ausgabe', lambda _: pytest.fail('Import ohne Migration'))
    run.lauf('2026-11-20', d)
    assert 'A:1' in t['jobs']
    assert 'Migration 014' in (d / 'bericht.md').read_text(encoding='utf-8')


def test_abgelaufene_datei_wird_nicht_importiert_firma_bleibt_bis_monatslauf(aufbau, monkeypatch):
    f = dict(firma('A'), quellen=['dax'], status='aktiv')
    d, t = aufbau([f, dict(firma('B'), quellen=['bestand'], status='aktiv')],
                  {'fake': lambda *a, **kw: [stelle('1')]})
    (d / 'ranglisten').mkdir()
    a = ausgabe(); a['ausgabe']['gueltig_bis'] = '2026-11-20'
    (d / 'ranglisten/dax.json').write_text(json.dumps(a), encoding='utf-8')
    monkeypatch.setattr(db, 'importiere_ausgabe', lambda _: pytest.fail('Abgelaufener Import'))
    run.lauf('2026-11-20', d)
    # Nutzer (Q258): Abschalten nur im monatlichen Ranglisten-Lauf, nicht im Nachtlauf
    assert t['companies']['A']['aktiv'] and t['companies']['B']['aktiv']
    assert 'A:1' in t['jobs'] and 'B:1' in t['jobs']


def test_ablauf_bereinigt_ausgaben_mit_service_rpc(monkeypatch):
    calls = []
    monkeypatch.setattr(db, '_req', lambda *a, **kw: calls.append((a, kw)))
    db.bereinige_ausgaben()
    assert calls == [(('POST', 'rpc/bereinige_ranking_ausgaben'), {'json': {}})]
