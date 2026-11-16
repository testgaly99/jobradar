"""Nachfüllfrist mit kontrollierter Uhr und ausschließlich künstlichen Bewerbungen."""
import pytest

from scraper import db, ki


@pytest.fixture
def bestand(monkeypatch):
    jetzt, geladen, gespeichert = [0.0], [], []
    daten = [{"id": str(i), "snapshot_text": f"Künstliche Anzeige {i}", "firma": None, "titel": None} for i in range(1, 5)]

    def lade():
        geladen.append(jetzt[0])
        return [a.copy() for a in daten if a["firma"] is None and a["titel"] is None]

    def speichere(id_, firma, titel):
        gespeichert.append((id_, firma, titel))
        next(a for a in daten if a["id"] == id_).update(firma=firma, titel=titel)

    monkeypatch.setattr(db, "bewerbungen_ohne_firma", lade)
    monkeypatch.setattr(db, "setze_firma_titel", speichere)
    return jetzt, daten, geladen, gespeichert


@pytest.mark.parametrize("frist", [0, -1])
def test_abgelaufene_startfrist_startet_keine_frage(bestand, frist, capsys):
    jetzt, daten, geladen, gespeichert = bestand
    calls = []
    assert ki.nachfuellen(frage_ft=lambda t: calls.append(t), frist_s=frist, uhr=lambda: jetzt[0]) == 0
    assert not calls and not gespeichert
    assert all(a["firma"] is a["titel"] is None for a in daten)
    assert "Frist abgelaufen" in capsys.readouterr().out


def test_db_ladezeit_zaehlt_mit_und_exakte_frist_startet_keine_frage(bestand, monkeypatch):
    jetzt, daten, _, gespeichert = bestand
    calls = []
    def langsam():
        jetzt[0] = 5.0
        return daten
    monkeypatch.setattr(db, "bewerbungen_ohne_firma", langsam)
    assert ki.nachfuellen(frage_ft=lambda t: calls.append(t), frist_s=5, uhr=lambda: jetzt[0]) == 0
    assert not calls and not gespeichert


def test_frist_bewahrt_erfolge_und_rest_kommt_im_naechsten_lauf(bestand):
    jetzt, daten, geladen, gespeichert = bestand
    calls = []
    def frage(text):
        calls.append(text)
        jetzt[0] += 3
        return "Testfirma", text
    assert ki.nachfuellen(frage_ft=frage, frist_s=5, uhr=lambda: jetzt[0]) == 2
    assert [s[0] for s in gespeichert] == ["1", "2"]
    assert [a["id"] for a in daten if a["firma"] is None] == ["3", "4"]
    assert ki.nachfuellen(frage_ft=frage, frist_s=5, uhr=lambda: jetzt[0]) == 2
    assert [s[0] for s in gespeichert] == ["1", "2", "3", "4"]
    assert geladen == [0.0, 6.0]
    assert calls == [f"Künstliche Anzeige {i}" for i in range(1, 5)]


def test_ungueltige_antwort_verbraucht_budget_ohne_erfolg_zu_loeschen(bestand):
    jetzt, daten, _, gespeichert = bestand
    calls = []
    def frage(text):
        calls.append(text)
        jetzt[0] += 3
        if len(calls) == 2:
            raise ki.Ungueltig("synthetisch")
        return "Testfirma", text
    assert ki.nachfuellen(frage_ft=frage, frist_s=5, uhr=lambda: jetzt[0]) == 1
    assert [s[0] for s in gespeichert] == ["1"]
    assert len(calls) == 2 and daten[0]["firma"] == "Testfirma"
    assert all(a["firma"] is None for a in daten[1:])


@pytest.mark.parametrize("fehler", [ki.Erschoepft("synthetisch"), ki.GroqWeg("synthetisch", 503)])
def test_kontingent_oder_groqausfall_bricht_weiterhin_sofort_ab(bestand, fehler):
    jetzt, _, _, gespeichert = bestand
    calls = []
    def frage(text):
        calls.append(text)
        raise fehler
    assert ki.nachfuellen(frage_ft=frage, frist_s=100, uhr=lambda: jetzt[0]) == 0
    assert calls == ["Künstliche Anzeige 1"] and gespeichert == []


def test_nulltreffer_zaehlen_weiterhin_nicht_als_nachgefuellt(bestand):
    jetzt, _, _, gespeichert = bestand
    calls = []
    def frage(text):
        calls.append(text)
        return None, None
    assert ki.nachfuellen(frage_ft=frage, frist_s=100, uhr=lambda: jetzt[0]) == 0
    assert len(calls) == 4 and gespeichert == []


def test_defaultbudget_folgt_der_vorhandenen_ki_fristkonvention(bestand):
    jetzt, _, _, gespeichert = bestand
    calls = []
    def frage(text):
        calls.append(text)
        jetzt[0] = 5400
        return "Testfirma", "Testtitel"
    assert ki.nachfuellen(frage_ft=frage, uhr=lambda: jetzt[0]) == 1
    assert len(calls) == len(gespeichert) == 1
