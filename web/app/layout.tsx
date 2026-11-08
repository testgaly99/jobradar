import type { Metadata } from "next";
import "./globals.css";
import Kopf from "./kopf";

export const metadata: Metadata = {
  title: "Jobradar",
  description: "Stellen finden und Bewerbungen verfolgen",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <Kopf />
        <main className="seite">{children}</main>
      </body>
    </html>
  );
}
