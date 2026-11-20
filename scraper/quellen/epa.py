from scraper.quellen import kandidat, xlsx
import re


def lies(daten):
    rows = xlsx.zeilen(daten)
    i = next((i for i, r in enumerate(rows) if r[:2] == ['Rank', 'Company']), None)
    if i is None:
        raise ValueError('EPA-Kopf fehlt')
    result = []
    jahr = next((int(m.group()) for r in rows[:i] for v in r if (m := re.search(r'\b20\d{2}\b', v))), None)
    for z in rows[i + 1:]:
        if not z or not z[0].isdigit():
            continue
        rang = int(z[0])
        if 1 <= rang <= 100:
            k = kandidat(z[1], 'epa-patente')
            k.update(rang=rang, land=z[3], jahr=jahr)
            result.append(k)
    return result
