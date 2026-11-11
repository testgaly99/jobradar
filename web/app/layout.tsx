import type { Metadata } from "next";
import "./globals.css";
import "./stil/utilitaer.css"; // Variante: nur diese Zeile tauschen
import Link from "next/link";
import Kopf from "./kopf";

export const metadata: Metadata = {
  title: "Jobradar",
  description: "Stellen finden und Bewerbungen verfolgen",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <a className="skiplink" href="#inhalt">Zum Inhalt springen</a>
        <Kopf />
        <main className="seite" id="inhalt">{children}</main>
        <footer className="seite fuss"><Link href="/datenschutz">Datenschutz</Link></footer>
      </body>
    </html>
  );
}
