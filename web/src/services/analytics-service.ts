import { supabase } from "@/config/supabase";
import type { DepartmentDayStats, WaitTimeSummary } from "@/types/analytics";
import { fail } from "./error";
import {
  toDepartmentDayStats,
  toWaitTimeSummary,
  type DepartmentDayStatsRow,
  type WaitTimeSummaryRow,
} from "./types/interfaces/analytics-interface";

export async function getAppointmentStats(from: string, to: string): Promise<DepartmentDayStats[]> {
  const { data, error } = await supabase.rpc("get_appointment_stats", { p_from: from, p_to: to });
  if (error) fail(error);
  return (data as DepartmentDayStatsRow[]).map(toDepartmentDayStats);
}

export async function getWaitTimeSummary(): Promise<WaitTimeSummary> {
  const { data, error } = await supabase.rpc("get_wait_time_summary");
  if (error) fail(error);
  return toWaitTimeSummary((data as WaitTimeSummaryRow[])[0]);
}
