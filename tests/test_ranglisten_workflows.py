from pathlib import Path


def test_workflows_nur_vorschlagszweige_und_einrichtung_manuell():
    root = Path(__file__).parents[1] / '.github/workflows'
    for name, modul in [('ranglisten', 'ranglisten_holen'), ('einrichtung', 'einrichtung')]:
        text = (root / (name + '.yml')).read_text(encoding='utf-8')
        assert 'workflow_dispatch:' in text and 'pull-requests: write' in text
        assert 'python -m scraper.' + modul in text
        assert 'gh pr create' in text and 'git push' in text
        assert 'git add data/' in text and 'git add -A' not in text
        assert 'SUPABASE' not in text and 'GROQ' not in text
        assert 'git push origin main' not in text
    assert '0 3 1 * *' in (root / 'ranglisten.yml').read_text()
    assert 'schedule:' not in (root / 'einrichtung.yml').read_text()


def test_einrichtung_sichert_fortschritt_vor_dem_jobabbruch():
    text = (Path(__file__).parents[1] / '.github/workflows/einrichtung.yml').read_text(encoding='utf-8')
    schritt = text[text.index('python -m scraper.einrichtung') - 200:text.index('python -m scraper.einrichtung')]
    assert 'timeout-minutes: 300' in schritt          # Python-Schritt endet vor dem 350-min-Jobabbruch
    assert 'if: always()' in text[text.index('python -m scraper.einrichtung'):]  # Vorschlag auch nach Abbruch
