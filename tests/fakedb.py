"""In-Memory-Ersatz fuer db._req (PostgREST), nur so viel wie der Scraper braucht."""


def _in(p):
    """Dekodiert genau das Format von db._in: in.("a","b\"c")."""
    assert p.startswith("in.(") and p.endswith(")")
    s, werte, i = p[4:-1], [], 0
    while i < len(s):
        assert s[i] == '"'
        i, w = i + 1, ""
        while s[i] != '"':
            if s[i] == "\\":
                i += 1
            w, i = w + s[i], i + 1
        werte.append(w)
        i += 1
        if i < len(s):
            assert s[i] == ","
            i += 1
    return werte


class FakeDB:
    def __init__(self):
        self.ohne_spalten = False
        self.ohne_funktion = False
        self.ohne_logo_spalte = False
        self.ohne_ki_spalten = False
        self.nachgeruestet = 0
        self.pruefungen = 0
        self.t = {"companies": {}, "jobs": {}, "laeufe": [], "applications": []}

    def __call__(self, method, pfad, params=None, json=None, headers=None):
        params = params or {}
        if method == "POST" and pfad == "rpc/snapshot_nachruesten":
            self.nachgeruestet += 1
            if self.ohne_funktion:
                raise RuntimeError("Supabase POST rpc/snapshot_nachruesten: 404 {\"code\":\"PGRST202\"}")
            return 3
        elif method == "POST" and pfad == "laeufe":
            self.t["laeufe"].append(json)
        elif method == "POST":
            assert "merge-duplicates" in headers["Prefer"]
            key = params["on_conflict"]
            for z in json:
                if self.ohne_spalten:
                    assert not {"abschnitte", "land", "steckbrief"} & set(z)
                self.t[pfad].setdefault(z[key], {}).update(z)  # merge wie PostgREST
        elif method == "GET" and pfad == "jobs" and params.get("select") == "ki":
            if self.ohne_ki_spalten:
                raise RuntimeError("Supabase GET jobs: 400 column jobs.ki does not exist")
            return []
        elif method == "GET" and pfad == "jobs" and params.get("select", "").startswith("id,text_hash"):
            assert params["status"] == "eq.offen" and params["text"] == "neq."
            rows = [z for z in self.t["jobs"].values() if z["status"] == "offen" and z.get("text") not in (None, "")]
            rows.sort(key=lambda z: z["id"])
            rows = rows[params["offset"]:params["offset"] + params["limit"]]
            return [{k: z.get(k) for k in params["select"].split(",")} for z in rows]
        elif method == "GET" and pfad == "jobs" and params.get("select") == "text,abschnitte":
            return [{"text": z.get("text"), "abschnitte": z.get("abschnitte")} for z in self.t["jobs"].values() if z["id"] == params["id"][3:]]
        elif method == "PATCH" and pfad == "jobs" and "studium" in params:
            assert {k: v for k, v in params.items() if k != "select"} == {"studium": "eq.nein", "status": "eq.offen",
                                                                          "sichtbar": "eq.true"}
            self.letzte_params = params
            treffer = [z for z in self.t["jobs"].values()
                       if z.get("studium") == "nein" and z["status"] == "offen" and z["sichtbar"]]
            for z in treffer:
                z.update(json)
            return [{"id": z["id"]} for z in treffer]
        elif method == "PATCH" and pfad == "jobs" and params["id"].startswith("eq."):
            self.t["jobs"][params["id"][3:]].update(json)
        elif method == "GET" and pfad == "applications" and params.get("select") == "id,snapshot_text":
            assert params["firma"] == params["titel"] == "is.null"
            return [{"id": a["id"], "snapshot_text": a["snapshot_text"]} for a in self.t["applications"]
                    if a["firma"] is None and a["titel"] is None]
        elif method == "PATCH" and pfad == "applications":
            assert params["firma"] == params["titel"] == "is.null"
            for a in self.t["applications"]:
                if a["id"] == params["id"][3:] and a["firma"] is None and a["titel"] is None:
                    a.update(json)
        elif method == "GET" and pfad == "jobs" and params.get("select") == "abschnitte,land,steckbrief":
            self.pruefungen += 1
            if self.ohne_spalten:
                raise RuntimeError("Supabase GET jobs: 400 column jobs.abschnitte does not exist")
            return []
        elif method == "GET" and pfad == "jobs":
            rows = [z for z in self.t["jobs"].values() if z["unternehmen"] == params["unternehmen"][3:]]
            rows.sort(key=lambda z: z["id"])
            return rows[params["offset"]:params["offset"] + params["limit"]]
        elif method == "GET" and pfad == "companies" and params.get("select") == "name,logo_url":
            if self.ohne_logo_spalte:
                raise RuntimeError("Supabase GET companies: 400 column companies.logo_url does not exist")
            return [{"name": z["name"], "logo_url": z.get("logo_url")} for z in self.t["companies"].values()]
        elif method == "GET" and pfad == "companies":
            return list(self.t["companies"].values())
        elif method == "GET" and pfad == "applications":
            ids = _in(params["job_id"])
            return [{"job_id": a} for a in self.t["applications"] if a in ids]
        elif method == "PATCH" and pfad == "companies":
            self.t["companies"][params["name"][3:]].update(json)
        elif method == "PATCH":
            for i in _in(params["id"]):
                self.t["jobs"][i].update(json)
        else:
            raise AssertionError((method, pfad))
