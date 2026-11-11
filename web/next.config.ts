import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // proxy.ts entfernt bei /bewerbungen/kanban usw. den Next-Url-Header (sonst fängt das Seitenfenster die Seite ab).
    // Die Prüfsumme im _rsc-Parameter enthält diesen Header; mit Prüfung gäbe es eine 307-Schleife und volles Neuladen.
    // Die Prüfung schützt nur vor CDNs, die "Vary" ignorieren; Vercel beachtet Vary, und angemeldete Seiten sind ohnehin nicht zwischengespeichert.
    // shortcut: abschalten statt Routen umbauen; Upgrade: Detailseite nach /bewerbung/[id] verschieben, dann entfällt der Proxy-Eingriff.
    validateRSCRequestHeaders: false,
  },
};

export default nextConfig;
