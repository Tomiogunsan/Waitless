export interface DepartmentDayStats {
  day: string;
  departmentId: string;
  appointments: number;
  completed: number;
  noShows: number;
  waitMinutes: number;
  waited: number;
}

export interface DailyPoint {
  date: string;
  counts: Record<string, number>;
  total: number;
  noShows: number;
  avgWaitMinutes: number | null;
}

export interface PeriodSummary {
  appointments: number;
  appointmentsPerClinicDay: number;
  avgWaitMinutes: number;
  completionRate: number;
  noShowRate: number;
}

export interface DepartmentShare {
  departmentId: string;
  name: string;
  count: number;
  share: number;
  busiestDay: string;
}

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
}

export interface WaitTimeSummary {
  recentMinutes: number | null;
  earlierMinutes: number | null;
}
