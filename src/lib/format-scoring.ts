/** Format fantasy line multiplier for UI (handles fractional × e.g. 1.5). */
export function formatMultiplierDisplay(multiplier: number): string {
  if (Number.isInteger(multiplier)) return String(multiplier);
  return multiplier.toFixed(2).replace(/\.?0+$/, "");
}
