export const PORTALE = ["linkedin.com", "lnkd.in", "stepstone.*", "indeed.*", "xing.com", "glassdoor.*", "monster.*", "kununu.com"];
export const ERWEITERUNG_GESPERRT = ["linkedin.com", "lnkd.in", "stepstone.*", "xing.com"];
export const PORTAL_EINGABE = "Aus diesem Link kann jobradar die Firma nicht lesen. Bitte Firma und Titel eintragen – die Chrome-Erweiterung macht das automatisch.";

function passt(host: string, muster: string[]): boolean {
  const teile = host.toLowerCase().replace(/\.$/, "").split(".");
  return muster.some(p => {
    if (!p.endsWith(".*")) return teile.length >= 2 && teile.slice(-p.split(".").length).join(".") === p;
    const name = p.slice(0, -2);
    const tld = teile.at(-1) ?? "";
    return tld.length >= 2 && (teile.at(-2) === name || (tld.length === 2 && ["co", "com"].includes(teile.at(-2) ?? "") && teile.at(-3) === name));
  });
}

export const istPortal = (host: string) => passt(host, PORTALE);
export const istIndeed = (host: string) => passt(host, ["indeed.*"]);
export const erweiterungGesperrt = (host: string) => passt(host, ERWEITERUNG_GESPERRT);
