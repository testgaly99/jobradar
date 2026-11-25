"""Q308: Formular und Speicher erlauben dieselben Dateiarten."""
import re
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
def test_formular_und_speicher_gleich():
    ts = (WURZEL / 'web/lib/dokumente.ts').read_text(encoding='utf-8')
    block = re.search(r'DATEIARTEN: Record<string, string> = \{(.*?)\};', ts, re.S).group(1)
    sql = (WURZEL / 'supabase/migrations/025_dokumente_dateiarten.sql').read_text(encoding='utf-8')
    erlaubt = set(re.findall(r"'([a-z]+/[\w.+-]+)'", sql))
    assert set(re.findall(r'"\.\w+": "([^"]+)"', block)) == erlaubt
    assert "where id = 'dokumente'" in sql
