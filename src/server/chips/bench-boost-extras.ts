/** Bench Boost: the manager picks this many extra players on top of their five. */
export const BENCH_BOOST_EXTRA_COUNT = 2;

/** Map the two nullable DB columns to a compact list (no gaps). */
export function extrasFromColumns(
  first: string | null | undefined,
  second: string | null | undefined,
): string[] {
  return [first, second].filter((id): id is string => id != null);
}

/** Map a list of extras to the two DB columns. */
export function extrasToColumns(ids: readonly string[]): {
  reservePlayerId: string | null;
  reservePlayerId2: string | null;
} {
  return {
    reservePlayerId: ids[0] ?? null,
    reservePlayerId2: ids[1] ?? null,
  };
}
