// Helper para converter MonthYear para string de data (primeiro/último dia)
export function monthYearToDateString(
  value: { month: number; year: number } | null,
  position: "start" | "end",
): string {
  if (!value) return "";

  const { month, year } = value;

  if (position === "start") {
    return `${year}-${String(month + 1).padStart(2, "0")}-01`;
  } else {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }
}

// Helper para converter string de data para MonthYear
export function dateStringToMonthYear(
  dateStr: string,
): { month: number; year: number } | null {
  if (!dateStr) return null;

  const [year, month] = dateStr.split("-").map(Number);
  if (isNaN(year) || isNaN(month)) return null;

  return { month: month - 1, year };
}
