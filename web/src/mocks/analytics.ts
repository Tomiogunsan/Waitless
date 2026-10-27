// Mock analytics derived the way the admin dashboard will compute them
// from the appointments table: counts per day per department, and average
// wait time from checked_in_at to actual_started_at.

import { DEMO_TODAY } from "@/lib/demo-clock";
import { addDays, isClinicDay } from "@/lib/time";
import { departments } from "./clinic";

/** Small seeded random generator so the charts are stable between reloads. */
function seeded(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DailyStats {
  date: string;
  byDepartment: Record<string, number>;
  total: number;
  avgWaitMinutes: number;
  completed: number;
  noShows: number;
}

const BASE_DEMAND: Record<string, [number, number]> = {
  "dep-gm": [14, 22],
  "dep-paed": [7, 12],
  "dep-og": [5, 9],
  "dep-derm": [3, 7],
};

function buildHistory(days: number): DailyStats[] {
  const random = seeded(42);
  const history: DailyStats[] = [];
  for (let i = days; i >= 1; i--) {
    const date = addDays(DEMO_TODAY, -i);
    if (!isClinicDay(date)) continue;
    const mondayBoost = new Date(`${date}T12:00:00Z`).getUTCDay() === 1 ? 1.2 : 1;
    const byDepartment: Record<string, number> = {};
    let total = 0;
    for (const d of departments) {
      const [min, max] = BASE_DEMAND[d.id]!;
      const count = Math.round((min + random() * (max - min)) * mondayBoost);
      byDepartment[d.id] = count;
      total += count;
    }
    const noShows = Math.round(total * (0.04 + random() * 0.06));
    history.push({
      date,
      byDepartment,
      total,
      noShows,
      completed: total - noShows - Math.round(random() * 2),
      // Waits trend down as the clinic adopts Waitless: ~25 min six months ago, ~14 now.
      avgWaitMinutes: Math.round((11 + i * 0.075 + random() * 5) * 10) / 10,
    });
  }
  return history;
}

const HISTORY = buildHistory(180);

export const RANGE_OPTIONS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

export type RangeDays = (typeof RANGE_OPTIONS)[number]["days"];

export function statsForRange(days: RangeDays): { current: DailyStats[]; previous: DailyStats[] } {
  const start = addDays(DEMO_TODAY, -days);
  const previousStart = addDays(DEMO_TODAY, -days * 2);
  return {
    current: HISTORY.filter((d) => d.date >= start),
    previous: HISTORY.filter((d) => d.date >= previousStart && d.date < start),
  };
}

export function summarize(rows: DailyStats[], departmentId: string | "all") {
  const count = (row: DailyStats) => (departmentId === "all" ? row.total : row.byDepartment[departmentId]!);
  const appointments = rows.reduce((sum, row) => sum + count(row), 0);
  const share = (row: DailyStats) => (row.total ? count(row) / row.total : 0);
  const noShows = rows.reduce((sum, row) => sum + row.noShows * share(row), 0);
  const completed = rows.reduce((sum, row) => sum + row.completed * share(row), 0);
  const avgWait = rows.length ? rows.reduce((sum, row) => sum + row.avgWaitMinutes, 0) / rows.length : 0;
  return {
    appointments,
    avgWaitMinutes: Math.round(avgWait * 10) / 10,
    completionRate: appointments ? completed / appointments : 0,
    noShowRate: appointments ? noShows / appointments : 0,
  };
}
