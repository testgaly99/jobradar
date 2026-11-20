from scraper.quellen import kandidat, xlsx


def aus_zeilen(zeilen):
    kopf, *rest = zeilen
    if not {'Year', 'World rank', 'Company', 'Country'} <= set(kopf):
        raise ValueError('Scoreboard-Kopf fehlt')
    rows = [dict(zip(kopf, z)) for z in rest if z and any(z)]
    jahr = max((int(z['Year']) for z in rows), default=0)
    result = []
    for z in rows:
        rang = int(z['World rank'])
        if int(z['Year']) != jahr or not 1 <= rang <= 200:
            continue
        k = kandidat(z['Company'], 'scoreboard-world')
        code = z.get('ISO3 Code') or z['Country']
        land = {'Germany': 'DE', 'DEU': 'DE', 'USA': 'US'}.get(code, code)
        k.update(rang=rang, land=land, jahr=jahr,
                 mitarbeitende=int(float(z['Employees'])) if z.get('Employees') else None)
        result.append(k)
    return sorted(result, key=lambda k: k['rang'])


def lies(daten):
    return aus_zeilen(xlsx.zeilen(daten))
