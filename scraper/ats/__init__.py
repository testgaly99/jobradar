from scraper.ats import ashby, greenhouse, liste, personio, recruitee, sitemap

ADAPTER = {"greenhouse": greenhouse.hole_stellen, "ashby": ashby.hole_stellen, "personio": personio.hole_stellen,
           "recruitee": recruitee.hole_stellen, "sitemap": sitemap.hole_stellen, "liste": liste.hole_stellen}
