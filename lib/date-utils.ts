export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
export function toDateOnly(isoString: string): string {
  return isoString.split("T")[0];
}
export function todayIsrael(): string {
  return new Date(new Date().getTime() + 3 * 60 * 60 * 1000)
    .toISOString().split("T")[0];
}
