from scraper.ats import ashby, greenhouse, personio

ADAPTER = {"greenhouse": greenhouse.hole_stellen, "ashby": ashby.hole_stellen, "personio": personio.hole_stellen}
