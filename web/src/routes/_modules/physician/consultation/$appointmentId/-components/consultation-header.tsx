import { StatusBadge } from "@/shared/badge/appointment-status-badge";
import Avatar from "@/shared/avatar/avatar";
import { Card } from "@/shared/card/card";
import { useNow } from "@/hooks/use-now";
import type { StaffAppointment } from "@/types/appointment";
import { cn } from "@/utils/cn";
import { formatTime } from "@/utils/time";

export function ConsultationHeader({ appointment }: { appointment: StaffAppointment }) {
  const now = useNow(1000);
  const running = appointment.status === "in_progress" && appointment.startedAt;
  const seconds = running
    ? Math.max(
        0,
        Math.floor(
          (now.getTime() - new Date(appointment.startedAt!).getTime()) / 1000,
        ),
      )
    : 0;
  const minutes = seconds / 60;
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-5 p-5">
      <div className="flex items-center gap-4">
        <Avatar name={appointment.patient.fullName} size="lg" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {appointment.patient.fullName}
            </h1>
            <StatusBadge status={appointment.status} />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Booked {formatTime(appointment.scheduledAt)}
            {appointment.checkedInAt &&
              ` · arrived ${formatTime(appointment.checkedInAt)}`}{" "}
            · <span className="font-mono">{appointment.reference}</span>
          </p>
        </div>
      </div>

      {running && (
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p
              className={cn(
                "tabular text-3xl font-semibold tracking-tight",
                minutes > 40
                  ? "text-red-600"
                  : minutes > 35
                    ? "text-amber-600"
                    : "text-slate-900",
              )}
              aria-live="off"
            >
              {clock}
            </p>
            <p className="text-xs text-slate-500">
              {minutes > 35
                ? "Over the 35-minute slot"
                : `${Math.ceil(35 - minutes)} min left with patient`}
            </p>
          </div>
          <ProgressRing value={Math.min(1, minutes / 35)} warn={minutes > 35} />
        </div>
      )}
    </Card>
  );
}

function ProgressRing({ value, warn }: { value: number; warn: boolean }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 52 52" className="size-14 -rotate-90" aria-hidden>
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        strokeWidth="5"
        className="stroke-slate-100"
      />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        className={cn(
          "transition-[stroke-dashoffset] duration-1000",
          warn ? "stroke-amber-500" : "stroke-brand-600",
        )}
      />
    </svg>
  );
}
