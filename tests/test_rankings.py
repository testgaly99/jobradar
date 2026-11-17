"""Künstliche Ranglisten; keine Dateien, Zugangsdaten oder Netzaufrufe."""
from copy import deepcopy

import pytest

from scraper.rankings import pruefe_ausgabe


def beispiel():
    return {
        "liste": {"id": "test-liste", "name": "Test-Liste", "herausgeber": "Test-Herausgeber"},
        "ausgabe": {
            "id": "test-liste-2026", "jahr": 2026,
            "veroeffentlicht_am": "2026-01-31", "geprueft_am": "2026-02-01",
            "gueltig_bis": "2027-02-28", "quelle_url": "https://rankings.example.org/2026",
            "lizenz": "Nur künstliche Testdaten",
        },
        "firmen": [{"unternehmen": "Testfirma A", "rang": 12}, {"unternehmen": "Testfirma B"}],
    }


FIRMEN = {"Testfirma A", "Testfirma B"}


def test_normalisiert_tabellenzeilen_ohne_freigabe_oder_eingabe_zu_aendern():
    daten = beispiel()
    vorher = deepcopy(daten)
    ergebnis = pruefe_ausgabe(daten, FIRMEN)
    assert daten == vorher
    assert ergebnis["ranking_listen"] == [{
        "id": "test-liste", "name": "Test-Liste", "herausgeber": "Test-Herausgeber", "aktiv": False,
    }]
    assert ergebnis["ranking_ausgaben"] == [{
        **daten["ausgabe"], "liste_id": "test-liste", "freigegeben": False,
    }]
    assert ergebnis["ranking_firmen"] == [
        {"ausgabe_id": "test-liste-2026", "unternehmen": "Testfirma A", "rang": 12},
        {"ausgabe_id": "test-liste-2026", "unternehmen": "Testfirma B", "rang": None},
    ]
    assert pruefe_ausgabe(daten, FIRMEN) == ergebnis


def test_gleicher_rang_unterschiedlicher_firmen_ist_erlaubt():
    daten = beispiel()
    daten["firmen"][1]["rang"] = 12
    daten["liste"]["aktiv"] = True
    daten["ausgabe"]["freigegeben"] = True
    ergebnis = pruefe_ausgabe(daten, FIRMEN)
    assert ergebnis["ranking_listen"][0]["aktiv"] is True
    assert ergebnis["ranking_ausgaben"][0]["freigegeben"] is True
    assert [f["rang"] for f in ergebnis["ranking_firmen"]] == [12, 12]


@pytest.mark.parametrize("firma", ["Unbekannt", "testfirma a", " Testfirma A ", None, 42])
def test_nur_exakt_bekannte_firmen(firma):
    daten = beispiel()
    daten["firmen"][0]["unternehmen"] = firma
    with pytest.raises(ValueError, match="unternehmen"):
        pruefe_ausgabe(daten, FIRMEN)


@pytest.mark.parametrize("rang", [12, 13])
def test_doppelte_firma_auch_bei_identischem_rang_abweisen(rang):
    daten = beispiel()
    daten["firmen"].append({"unternehmen": "Testfirma A", "rang": rang})
    with pytest.raises(ValueError, match="doppelt"):
        pruefe_ausgabe(daten, FIRMEN)


@pytest.mark.parametrize("rang", [True, False, 0, -1, 1.5, "12", 2147483648])
def test_rang_muss_positive_datenbank_ganzzahl_sein(rang):
    daten = beispiel()
    daten["firmen"][0]["rang"] = rang
    with pytest.raises(ValueError, match="rang"):
        pruefe_ausgabe(daten, FIRMEN)


@pytest.mark.parametrize("url", [
    "javascript:alert(1)", "http://rankings.example.org", "//rankings.example.org",
    "https://name:pass@rankings.example.org", "https://rankings.example.org@evil.example.org",
    "https://rankings.example.org/a b", "https://rankings.example.org/\nfoo",
    "https://rankings.example.org\\@evil.example.org", "https://", "https:///test",
    "https://rankings.example.org:abc/", "https://rankings.example.org:70000/",
    "https://rankings.example.org/%0afoo", "https://rankings.example.org/\x00foo",
    "https://rankings.example.org/\u200bfoo", None,
    "https://quelle_test.example/ranking", "https://%65xample.org/ranking",
])
def test_unsichere_oder_defekte_quelladresse_abweisen(url):
    daten = beispiel()
    daten["ausgabe"]["quelle_url"] = url
    with pytest.raises(ValueError, match="quelle_url"):
        pruefe_ausgabe(daten, FIRMEN)


@pytest.mark.parametrize("feld,wert", [
    ("veroeffentlicht_am", "2026-02-30"), ("veroeffentlicht_am", "20260131"),
    ("veroeffentlicht_am", "2026-01-31T00:00:00"), ("geprueft_am", "2026-01-30"),
    ("gueltig_bis", "2027-03-01"), ("gueltig_bis", "2026-01-31"),
    ("gueltig_bis", "2026-01-30"), ("gueltig_bis", True),
    ("geprueft_am", "2027-03-01"), ("jahr", True), ("jahr", "2026"),
    ("jahr", 2026.0), ("jahr", 0), ("jahr", 10000),
])
def test_daten_jahr_und_maximal_13_kalendermonate(feld, wert):
    daten = beispiel()
    daten["ausgabe"][feld] = wert
    with pytest.raises(ValueError):
        pruefe_ausgabe(daten, FIRMEN)


def test_13_monate_mit_schaltjahr_und_abweichendem_ausgabejahr():
    daten = beispiel()
    daten["ausgabe"].update({"jahr": 2025, "veroeffentlicht_am": "2023-01-31",
                            "geprueft_am": "2023-02-01", "gueltig_bis": "2024-02-29"})
    assert pruefe_ausgabe(daten, FIRMEN)["ranking_ausgaben"][0]["gueltig_bis"] == "2024-02-29"
    daten["ausgabe"]["gueltig_bis"] = "2024-03-01"
    with pytest.raises(ValueError, match="13"):
        pruefe_ausgabe(daten, FIRMEN)


@pytest.mark.parametrize("bereich,feld,wert", [
    ("liste", "id", "Test-Liste"), ("liste", "id", "test liste"),
    ("liste", "id", "../test"), ("liste", "id", ""),
    ("ausgabe", "id", "x" * 81), ("liste", "name", "  "),
    ("liste", "herausgeber", None), ("ausgabe", "lizenz", ""),
    ("liste", "aktiv", "ja"), ("ausgabe", "freigegeben", 1),
    ("liste", "name", "Test\nListe"),
])
def test_fehlerhafte_metadaten_abweisen(bereich, feld, wert):
    daten = beispiel()
    daten[bereich][feld] = wert
    with pytest.raises(ValueError, match=feld):
        pruefe_ausgabe(daten, FIRMEN)


@pytest.mark.parametrize("daten", [None, [], {}, {"liste": [], "ausgabe": {}, "firmen": []}])
def test_defekte_grundstruktur_wird_als_prueffehler_gemeldet(daten):
    with pytest.raises(ValueError):
        pruefe_ausgabe(daten, FIRMEN)


@pytest.mark.parametrize("firmen", [None, "Testfirma A", {}, [None]])
def test_defekte_firmenliste_abweisen(firmen):
    daten = beispiel()
    daten["firmen"] = firmen
    with pytest.raises(ValueError, match="firmen"):
        pruefe_ausgabe(daten, FIRMEN)


def test_leere_firmenliste_als_vorbereitung_erlaubt():
    daten = beispiel()
    daten["firmen"] = []
    assert pruefe_ausgabe(daten, FIRMEN)["ranking_firmen"] == []


@pytest.mark.parametrize("bereich,feld,laenge", [
    ("liste", "name", 200), ("liste", "herausgeber", 200), ("ausgabe", "lizenz", 1000),
])
def test_textgrenzen_passend_zur_datenbank(bereich, feld, laenge):
    daten = beispiel()
    daten[bereich][feld] = "x" * laenge
    assert pruefe_ausgabe(daten, FIRMEN)
    daten[bereich][feld] += "x"
    with pytest.raises(ValueError, match=feld):
        pruefe_ausgabe(daten, FIRMEN)


def test_kennungsgrenze_80_und_zukunftsdatum_als_inaktiver_entwurf():
    daten = beispiel()
    daten["liste"]["id"] = "x" * 80
    daten["ausgabe"].update({"jahr": 2100, "veroeffentlicht_am": "2100-01-01",
                            "geprueft_am": "2100-01-02", "gueltig_bis": "2101-02-01"})
    ergebnis = pruefe_ausgabe(daten, FIRMEN)
    assert ergebnis["ranking_listen"][0]["id"] == "x" * 80
    assert ergebnis["ranking_ausgaben"][0]["freigegeben"] is False


def test_quelladresse_begrenzt_und_https_schema_normalisiert():
    daten = beispiel()
    daten["ausgabe"]["quelle_url"] = "HTTPS://rankings.example.org/2026"
    assert pruefe_ausgabe(daten, FIRMEN)["ranking_ausgaben"][0]["quelle_url"] == "https://rankings.example.org/2026"
    daten["ausgabe"]["quelle_url"] = "https://rankings.example.org/" + "x" * 2000
    with pytest.raises(ValueError, match="quelle_url"):
        pruefe_ausgabe(daten, FIRMEN)


@pytest.mark.parametrize("url,normalisiert", [
    ("https://münchen.example/ranking", "https://xn--mnchen-3ya.example/ranking"),
    ("HTTPS://QUELLE.EXAMPLE:443/ranking?q=1#quelle", "https://quelle.example:443/ranking?q=1#quelle"),
    ("https://[2001:db8::1]/ranking", "https://[2001:db8::1]/ranking"),
])
def test_quelladresse_hat_speicherbare_kanonische_hostdarstellung(url, normalisiert):
    daten = beispiel()
    daten["ausgabe"]["quelle_url"] = url
    assert pruefe_ausgabe(daten, FIRMEN)["ranking_ausgaben"][0]["quelle_url"] == normalisiert


def test_quelladresse_bleibt_auch_nach_idn_normalisierung_in_der_datenbankgrenze():
    daten = beispiel()
    prefix = "https://münchen.example/"
    daten["ausgabe"]["quelle_url"] = prefix + "x" * (2000 - len(prefix))
    with pytest.raises(ValueError, match="quelle_url"):
        pruefe_ausgabe(daten, FIRMEN)
