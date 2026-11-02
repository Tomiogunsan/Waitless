import { CalendarCheck2, CheckCircle2, Timer, UserX } from "lucide-react";
import StatTile from "@/shared/stat-tile/stat-tile";
import type { PeriodSummary } from "@/types/analytics";
import { formatPercent, percentChange } from "@/utils/analytics";

const signed = (value: number, digits = 1) => `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;

export function AnalyticsStats({ now, before }: { now: PeriodSummary; before: PeriodSummary }) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <StatTile
        label="Appointments"
        value={now.appointments.toLocaleString()}
        icon={CalendarCheck2}
        delta={{
          value: percentChange(now.appointments, before.appointments),
          label: "vs previous period",
          format: (v) => `${signed(v)}%`,
        }}
      />
      <StatTile
        label="Average wait"
        value={`${now.avgWaitMinutes} min`}
        icon={Timer}
        delta={{
          value: Math.round((now.avgWaitMinutes - before.avgWaitMinutes) * 10) / 10,
          label: "check-in to seen",
          format: (v) => `${signed(v)} min`,
          upIsGood: false,
        }}
      />
      <StatTile
        label="Completion rate"
        value={formatPercent(now.completionRate)}
        icon={CheckCircle2}
        delta={{
          value: (now.completionRate - before.completionRate) * 100,
          label: "vs previous period",
          format: (v) => `${signed(v)} pts`,
        }}
      />
      <StatTile
        label="No-show rate"
        value={formatPercent(now.noShowRate)}
        icon={UserX}
        delta={{
          value: (now.noShowRate - before.noShowRate) * 100,
          label: "vs previous period",
          format: (v) => `${signed(v)} pts`,
          upIsGood: false,
        }}
      />
    </div>
  );
}
