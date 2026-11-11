// Entmerken löscht nur im Status gemerkt; ab beworben gibt es in der Stellenliste keinen Umschalter mehr.
export const darfEntmerken = (status: string | null | undefined) => status === "gemerkt";
