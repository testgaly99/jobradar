export function bestaetigt(eingabe: string | null | undefined): boolean {
  return eingabe?.trim() === "LÖSCHEN";
}
