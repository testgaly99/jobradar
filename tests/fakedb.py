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
        self.t = {"companies": {}, "jobs": {}, "laeufe": [], "applications": []}

    def __call__(self, method, pfad, params=None, json=None, headers=None):
        params = params or {}
        if method == "POST" and pfad == "laeufe":
            self.t["laeufe"].append(json)
        elif method == "POST":
            assert "merge-duplicates" in headers["Prefer"]
            key = params["on_conflict"]
            for z in json:
                self.t[pfad].setdefault(z[key], {}).update(z)  # merge wie PostgREST
        elif method == "GET" and pfad == "jobs":
            rows = [z for z in self.t["jobs"].values() if z["unternehmen"] == params["unternehmen"][3:]]
            rows.sort(key=lambda z: z["id"])
            return rows[params["offset"]:params["offset"] + params["limit"]]
        elif method == "GET" and pfad == "companies":
            return list(self.t["companies"].values())
        elif method == "GET" and pfad == "applications":
            ids = _in(params["job_id"])
            return [{"job_id": a} for a in self.t["applications"] if a in ids]
        elif method == "PATCH":
            for i in _in(params["id"]):
                self.t["jobs"][i].update(json)
        else:
            raise AssertionError((method, pfad))
