export const PORTALE = ["linkedin.com", "lnkd.in", "stepstone.*", "indeed.*", "xing.*", "glassdoor.*", "monster.*", "kununu.*",
  "jobs.zeit.de", "jobs.faz.net", "stellenmarkt.sueddeutsche.de", "welcometothejungle.com", "jobup.ch",
  "azubiyo.de", "kleinanzeigen.de", "willhaben.at", "talent.com", "careerbuilder.*", "jobstairs.de",
  "karriere.at", "stellenanzeigen.de", "jobware.de", "meinestadt.de", "absolventa.de", "ausbildung.de",
  "arbeitsagentur.de", "jobs.ch", "jobscout24.ch", "stellenwerk.de", "yourfirm.de", "experteer.*",
  "get-in-it.de", "staufenbiel.de", "jobvector.de", "academics.de", "hokify.*", "heyjobs.*", "jobrapido.*",
  "careerjet.*", "jooble.*", "adzuna.*", "kimeta.de", "jobteaser.com", "ziprecruiter.com", "totaljobs.com"];
export const ERWEITERUNG_GESPERRT = ["linkedin.com", "lnkd.in", "stepstone.*", "xing.*"];
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
