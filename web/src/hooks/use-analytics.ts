import { useQuery } from "@tanstack/react-query";
import { getAppointmentStats, getWaitTimeSummary } from "@/services/analytics-service";

export const analyticsKeys = {
  all: ["analytics"] as const,
  stats: (from: string, to: string) => [...analyticsKeys.all, "stats", from, to] as const,
  waitSummary: () => [...analyticsKeys.all, "wait-summary"] as const,
};

export function useAppointmentStats(from: string, to: string) {
  return useQuery({
    queryKey: analyticsKeys.stats(from, to),
    queryFn: () => getAppointmentStats(from, to),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useWaitTimeSummary() {
  return useQuery({
    queryKey: analyticsKeys.waitSummary(),
    queryFn: getWaitTimeSummary,
    staleTime: 10 * 60_000,
  });
}
