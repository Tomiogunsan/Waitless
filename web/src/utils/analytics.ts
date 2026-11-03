import type {
  DailyPoint,
  DepartmentDayStats,
  DepartmentShare,
  PeriodSummary,
} from "@/types/analytics";
import type { Department } from "@/types/booking";
import { addDays, isClinicDay, isoWeekday } from "./time";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const sum = <T>(items: T[], pick: (item: T) => number) =>
  items.reduce((total, item) => total + pick(item), 0);

const oneDecimal = (value: number) => Math.round(value * 10) / 10;

export function clinicDaysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (isClinicDay(date)) days.push(date);
  }
  return days;
}

export function averageWait(stats: DepartmentDayStats[]): number {
  const waited = sum(stats, (s) => s.waited);
  return waited ? oneDecimal(sum(stats, (s) => s.waitMinutes) / waited) : 0;
}

export function dailyPoints(stats: DepartmentDayStats[], days: string[], departmentIds: string[]): DailyPoint[] {
  return days.map((date) => {
    const rows = stats.filter((s) => s.day === date && departmentIds.includes(s.departmentId));
    return {
      date,
      counts: Object.fromEntries(
        departmentIds.map((id) => [id, rows.find((r) => r.departmentId === id)?.appointments ?? 0]),
      ),
      total: sum(rows, (r) => r.appointments),
      noShows: sum(rows, (r) => r.noShows),
      avgWaitMinutes: sum(rows, (r) => r.waited) ? averageWait(rows) : null,
    };
  });
}

// Periods of equal length can hold a different number of weekdays,
// so volume is compared per clinic day.
export function summarize(stats: DepartmentDayStats[], clinicDays: number): PeriodSummary {
  const appointments = sum(stats, (s) => s.appointments);
  return {
    appointments,
    appointmentsPerClinicDay: clinicDays ? appointments / clinicDays : 0,
    avgWaitMinutes: averageWait(stats),
    completionRate: appointments ? sum(stats, (s) => s.completed) / appointments : 0,
    noShowRate: appointments ? sum(stats, (s) => s.noShows) / appointments : 0,
  };
}

export function departmentShares(stats: DepartmentDayStats[], departments: Department[]): DepartmentShare[] {
  const total = sum(stats, (s) => s.appointments);
  return departments
    .map((d) => {
      const rows = stats.filter((s) => s.departmentId === d.id);
      const byWeekday = WEEKDAYS.map((_, i) =>
        sum(rows.filter((r) => isoWeekday(r.day) === i + 1), (r) => r.appointments),
      );
      const count = sum(rows, (r) => r.appointments);
      return {
        departmentId: d.id,
        name: d.name,
        count,
        share: total ? count / total : 0,
        busiestDay: WEEKDAYS[byWeekday.indexOf(Math.max(...byWeekday))]!,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function percentChange(now: number, before: number): number {
  return before ? ((now - before) / before) * 100 : 0;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function dailyPointsCsv(points: DailyPoint[], series: { id: string; name: string }[]): string {
  const header = ["date", ...series.map((s) => s.name), "total", "avg_wait_minutes", "no_shows"];
  const lines = points.map((p) =>
    [p.date, ...series.map((s) => p.counts[s.id] ?? 0), p.total, p.avgWaitMinutes ?? "", p.noShows].join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\n");
}

// Department names can contain "&" or commas; quote every header cell.
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
