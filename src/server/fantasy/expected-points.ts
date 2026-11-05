/** Average points over recent published gameweeks (rounded). Empty form → 0. */
export function computeExpectedPoints(form: readonly number[]): number {
  if (form.length === 0) return 0;
  const total = form.reduce((sum, value) => sum + value, 0);
  return Math.round(total / form.length);
}
