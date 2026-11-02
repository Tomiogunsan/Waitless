export const RANGE_OPTIONS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

export type RangeDays = (typeof RANGE_OPTIONS)[number]["days"];

export const DEFAULT_RANGE: RangeDays = 30;

export function isRangeDays(value: unknown): value is RangeDays {
  return RANGE_OPTIONS.some((o) => o.days === Number(value));
}
