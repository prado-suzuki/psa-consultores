import type { MonthRange } from "./month-range-picker";

/** Convert a MonthRange to start/end date strings */
export function monthRangeToDateStrings(
  range: MonthRange | null,
): { start: string; end: string } {
  if (!range) return { start: "", end: "" };
  const { start, end } = range;
  const startStr = `${start.year}-${String(start.month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(end.year, end.month + 1, 0).getDate();
  const endStr = `${end.year}-${String(end.month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start: startStr, end: endStr };
}
