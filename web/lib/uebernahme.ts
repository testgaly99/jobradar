// Längenregel für den optionalen Anzeigentext. Rein, ohne Next-Importe, damit testbar.
export const MAX_TEXT = 50_000;

// Für die Längenprüfung zählt ein Zeilenumbruch einmal, egal ob \r\n (Formular) oder \n.
export const textZuLang = (s: string) => s.replace(/\r\n/g, "\n").trim().length > MAX_TEXT;
