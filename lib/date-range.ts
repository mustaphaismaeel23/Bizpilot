import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";

export type RangeKey = "today" | "yesterday" | "week" | "month" | "last_month" | "custom";

export function resolveRange(range: RangeKey | null, from?: string | null, to?: string | null) {
  const now = new Date();

  switch (range) {
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
    case "month":
      return { from: startOfMonth(now), to: endOfDay(now) };
    case "last_month": {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    case "custom":
      return {
        from: from ? startOfDay(new Date(from)) : startOfMonth(now),
        to: to ? endOfDay(new Date(to)) : endOfDay(now),
      };
    case "today":
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}
