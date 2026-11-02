import type { DepartmentDayStats, WaitTimeSummary } from "@/types/analytics";

export interface DepartmentDayStatsRow {
  day: string;
  department_id: string;
  appointments: number;
  completed: number;
  no_shows: number;
  wait_minutes: number;
  waited: number;
}

export function toDepartmentDayStats(row: DepartmentDayStatsRow): DepartmentDayStats {
  return {
    day: row.day,
    departmentId: row.department_id,
    appointments: row.appointments,
    completed: row.completed,
    noShows: row.no_shows,

    waitMinutes: Number(row.wait_minutes),
    waited: row.waited,
  };
}

export interface WaitTimeSummaryRow {
  recent_minutes: number | null;
  earlier_minutes: number | null;
}

export function toWaitTimeSummary(row: WaitTimeSummaryRow | undefined): WaitTimeSummary {
  return {
    recentMinutes: row?.recent_minutes ?? null,
    earlierMinutes: row?.earlier_minutes ?? null,
  };
}
