"""Reine Parser für die vorbereiteten offenen Firmenquellen."""


def kandidat(name, liste_id, **werte):
    return dict(name=name, liste_id=liste_id, wikidata_id=None, website=None,
                rang=None, mitarbeitende=None, branche_wd=None, hauptsitz=None, **werte)
