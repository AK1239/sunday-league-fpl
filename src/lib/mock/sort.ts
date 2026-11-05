import type { StandingSort } from "./data";

const SORT_VALUES: StandingSort[] = [
  "points",
  "goals",
  "assists",
  "appearances",
  "average",
];

export function parseStandingSort(value: string | undefined): StandingSort {
  if (value && SORT_VALUES.includes(value as StandingSort)) {
    return value as StandingSort;
  }
  return "points";
}
