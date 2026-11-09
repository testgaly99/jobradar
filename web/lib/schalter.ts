// Welche Umschalt-Aktion darf bei welchem Status etwas tun? (Merken/Beworben sind getrennte Kategorien.)
export const darfEntmerken = (status: string | null | undefined) => status === "gemerkt";
export const darfZuruecknehmen = (status: string | null | undefined) => status === "beworben";
