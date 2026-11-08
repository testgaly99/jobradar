"""In-Memory-Ersatz fuer db._req (PostgREST), nur so viel wie der Scraper braucht."""


def _in(p):
    return [x.strip('"') for x in p[4:-1].split(",")]


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
        elif method == "GET" and pfad == "applications":
            ids = _in(params["job_id"])
            return [{"job_id": a} for a in self.t["applications"] if a in ids]
        elif method == "PATCH":
            for i in _in(params["id"]):
                self.t["jobs"][i].update(json)
        else:
            raise AssertionError((method, pfad))
