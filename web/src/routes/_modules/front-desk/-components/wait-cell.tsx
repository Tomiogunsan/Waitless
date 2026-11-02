import { CheckCircle2, Clock } from "lucide-react";
import type { StaffAppointment } from "@/types/appointment";
import { cn } from "@/utils/cn";
import { formatDuration, minutesBetween } from "@/utils/time";

export function WaitCell({
  appointment: a,
  now,
}: {
  appointment: StaffAppointment;
  now: Date;
}) {
  if (a.status === "checked_in" && a.checkedInAt) {
    const minutes = minutesBetween(a.checkedInAt, now);
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5",
          minutes >= 20 && "font-medium text-amber-700",
        )}
      >
        <Clock className="size-3.5" aria-hidden />
        {formatDuration(minutes)}
      </span>
    );
  }
  if (a.status === "in_progress" && a.startedAt) {
    return (
      <span className="text-violet-700">
        In for {formatDuration(minutesBetween(a.startedAt, now))}
      </span>
    );
  }
  if (a.status === "completed" && a.checkedInAt && a.startedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-400">
        <CheckCircle2 className="size-3.5" aria-hidden />
        Waited{" "}
        {formatDuration(minutesBetween(a.checkedInAt, a.startedAt))}
      </span>
    );
  }
  return <span className="text-slate-300">—</span>;
}
