import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./stil/utilitaer.css"; // Variante: nur diese Zeile tauschen
import Link from "next/link";
import Kopf from "./kopf";
import { ROBOTS } from "@/lib/oeffentlich";

export const metadata: Metadata = {
  title: "Jobradar",
  description: "Stellen finden und Bewerbungen verfolgen",
  robots: ROBOTS,
};

// A7: Browserleiste am Handy in Papierfarbe; Werte spiegeln --color-paper aus stil/utilitaer.css (hell/dunkel).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "oklch(97.6% 0.011 88)" },
    { media: "(prefers-color-scheme: dark)", color: "oklch(16.5% 0.012 170)" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <a className="skiplink" href="#inhalt">Zum Inhalt springen</a>
        <Kopf />
        <main className="seite" id="inhalt">{children}</main>
        <footer className="seite fuss"><Link href="/impressum">Impressum</Link> · <Link href="/datenschutz">Datenschutz</Link></footer>
      </body>
    </html>
  );
}
