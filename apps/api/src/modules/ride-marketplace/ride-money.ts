/** All arithmetic on offered money uses integer minor units. */
export function minorUnits(value: number | string): number {
  const result = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(result)) throw new Error("Invalid money amount");
  return result;
}
export function money(value: number): string {
  return (value / 100).toFixed(2);
}
export function unitAmount(
  minimum: number | string,
  step: number | string,
  steps: number,
): string {
  return money(minorUnits(minimum) + minorUnits(step) * steps);
}
export function totalAmount(unit: number | string, count: number): string {
  return money(minorUnits(unit) * count);
}
