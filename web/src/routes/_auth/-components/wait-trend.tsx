import { Clock } from "lucide-react";
import { useWaitTimeSummary } from "@/hooks/use-analytics";

export function WaitTrend() {
  const { data: wait } = useWaitTimeSummary();
  if (wait?.recentMinutes == null) return null;
  const { recentMinutes, earlierMinutes } = wait;
  const improved = earlierMinutes != null && earlierMinutes > recentMinutes;

  return (
    <p className="relative flex items-center gap-2 text-sm text-brand-100">
      <Clock className="size-4" aria-hidden />
      {improved
        ? `Average wait down from ${earlierMinutes} to ${recentMinutes} minutes in 3 months.`
        : `Average wait this week: ${recentMinutes} minutes.`}
    </p>
  );
}
