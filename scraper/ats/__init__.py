from scraper.ats import ashby, greenhouse, personio, recruitee

ADAPTER = {"greenhouse": greenhouse.hole_stellen, "ashby": ashby.hole_stellen, "personio": personio.hole_stellen,
           "recruitee": recruitee.hole_stellen}
