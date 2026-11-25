"""Q308: Formular und Speicher erlauben dieselben Dateiarten."""
import re
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
MIME = {'.pdf': 'application/pdf', '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png'}


def test_formular_und_speicher_gleich():
    arten = re.search(r'const ARTEN = "([^"]+)"', (WURZEL / 'web/app/unterlagen/upload.tsx').read_text(encoding='utf-8')).group(1)
    sql = (WURZEL / 'supabase/migrations/025_dokumente_dateiarten.sql').read_text(encoding='utf-8')
    erlaubt = set(re.findall(r"'([a-z]+/[\w.+-]+)'", sql))
    assert {MIME[e] for e in arten.split(',')} == erlaubt
    assert "where id = 'dokumente'" in sql
