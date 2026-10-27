import { CalendarCheck2, Clock, Stethoscope, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatDate, formatTimeRange } from "@/utils/time";

export function Summary({
  departmentName,
  slotAt,
}: {
  departmentName?: string;
  slotAt: string | null;
}) {
  const rows: { icon: LucideIcon; label: string; value: string | null }[] = [
    { icon: Stethoscope, label: "Department", value: departmentName ?? null },
    {
      icon: CalendarCheck2,
      label: "Date",
      value: slotAt ? formatDate(slotAt) : null,
    },
    {
      icon: Clock,
      label: "Time",
      value: slotAt ? formatTimeRange(slotAt) : null,
    },
    {
      icon: UserRound,
      label: "Doctor",
      value: departmentName ? "First available, assigned for you" : null,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <h2 className="text-sm font-semibold text-slate-900">Your appointment</h2>
      <dl className="mt-4 space-y-4">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd
                className={cn(
                  "text-sm font-medium",
                  value ? "text-slate-900" : "text-slate-300",
                )}
              >
                {value ?? "Not selected"}
              </dd>
            </div>
          </div>
        ))}
      </dl>
      <div className="mt-5 rounded-xl bg-brand-50 p-3.5 text-xs leading-relaxed text-brand-900">
        Arrive 10 minutes early and check in at the front desk. If your doctor
        is running late, later appointments are moved automatically so you never
        wait long.
      </div>
    </div>
  );
}
