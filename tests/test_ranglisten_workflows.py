from pathlib import Path


def test_workflows_nur_vorschlagszweige_einrichtung_naechtlich():
    root = Path(__file__).parents[1] / '.github/workflows'
    for name, modul in [('ranglisten', 'ranglisten_holen'), ('einrichtung', 'einrichtung')]:
        text = (root / (name + '.yml')).read_text(encoding='utf-8')
        assert 'workflow_dispatch:' in text and 'pull-requests: write' in text
        assert 'python -m scraper.' + modul in text
        assert 'gh pr create' in text and 'git push' in text
        assert 'git add data/' in text and 'git add -A' not in text
        assert 'GROQ' not in text
        if name == 'ranglisten':
            assert 'SUPABASE' not in text
        else:
            assert 'secrets.SUPABASE_SERVICE_KEY' in text
            assert 'einrichtung_privat.md' not in text
            assert 'upload-artifact' not in text  # Artefakte öffentlicher Repos sind nicht privat.
        assert 'git push origin main' not in text
    assert '0 3 1 * *' in (root / 'ranglisten.yml').read_text()
    einrichtung = (root / 'einrichtung.yml').read_text(encoding='utf-8')
    # Q299: jede Nacht automatisch, aber nur auf dem Vorschlagszweig; nie direkt nach main, nie Verlauf überschreiben
    assert '0 21 * * 1-6' in einrichtung and '0 21 * * 0' in einrichtung
    assert 'einrichtung-laufend' in einrichtung and '--force' not in einrichtung and 'gh pr merge' not in einrichtung


def test_einrichtung_sichert_fortschritt_vor_dem_jobabbruch():
    text = (Path(__file__).parents[1] / '.github/workflows/einrichtung.yml').read_text(encoding='utf-8')
    schritt = text[text.index('python -m scraper.einrichtung') - 200:text.index('python -m scraper.einrichtung')]
    assert 'timeout-minutes: 300' in schritt          # Python-Schritt endet vor dem 350-min-Jobabbruch
    assert 'if: always()' in text[text.index('python -m scraper.einrichtung'):]  # Vorschlag auch nach Abbruch
