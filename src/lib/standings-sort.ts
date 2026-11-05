import type { StandingsSort } from "@/server/queries/standings";

const SORT_VALUES: StandingsSort[] = [
  "points",
  "goals",
  "assists",
  "appearances",
  "average",
];

export function parseStandingSort(value: string | undefined): StandingsSort {
  if (value && SORT_VALUES.includes(value as StandingsSort)) {
    return value as StandingsSort;
  }
  return "points";
}

export type { StandingsSort };
