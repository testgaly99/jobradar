import csv


def lade_unternehmen(pfad="data/companies.csv"):
    with open(pfad, encoding="utf-8-sig", newline="") as f:
        zeilen = list(csv.DictReader(f))
    for z in zeilen:
        z["kategorie"] = [k.strip() for k in z["kategorie"].split(";") if k.strip()]
    return zeilen
