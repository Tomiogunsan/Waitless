import { Clock } from "lucide-react";
import Avatar from "@/shared/avatar/avatar";
import Badge from "@/shared/badge/badge";
import type { StaffAppointment } from "@/types/appointment";
import { cn } from "@/utils/cn";
import { formatDuration, minutesBetween } from "@/utils/time";

/** Each doctor at a glance: who they're with, who's waiting, how late they're running. */
export function DoctorBoard({
  today,
  now,
}: {
  today: StaffAppointment[];
  now: Date;
}) {
  // Each appointment carries its doctor and department, so build the list from them.
  const doctors = [
    ...new Map(
      today.map((a) => [
        a.physician.id,
        { ...a.physician, department: a.department.name },
      ]),
    ).values(),
  ];

  return (
    <section aria-labelledby="doctors-heading">
      <h2
        id="doctors-heading"
        className="mb-3 text-sm font-semibold text-slate-900"
      >
        Doctors today
      </h2>
      <div className="relative flex snap-x gap-3 overflow-x-auto pb-2 scrollbar-none">
        {doctors.map((doctor) => {
          const mine = today.filter((a) => a.physician.id === doctor.id);
          const current = mine.find((a) => a.status === "in_progress");
          const waiting = mine.filter((a) => a.status === "checked_in").length;
          const lateBy = current?.startedAt
            ? Math.max(0, minutesBetween(current.scheduledAt, current.startedAt))
            : 0;
          const remaining = mine.filter(
            (a) => a.status === "scheduled" || a.status === "checked_in",
          ).length;

          return (
            <article
              key={doctor.id}
              className="w-64 shrink-0 snap-start rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="relative">
                  <Avatar name={doctor.fullName} size="md" />
                  <span
                    className={cn(
                      "absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-white",
                      current ? "bg-violet-500" : "bg-emerald-500",
                    )}
                    aria-hidden
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {doctor.fullName}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {doctor.department}
                  </p>
                </div>
              </div>
              <p className="mt-3 truncate text-sm text-slate-600">
                {current ? (
                  <>
                    With{" "}
                    <span className="font-medium text-slate-900">
                      {current.patient.fullName}
                    </span>{" "}
                    ·{" "}
                    {formatDuration(
                      minutesBetween(current.startedAt!, now),
                    )}
                  </>
                ) : (
                  <span className="text-emerald-700">Available</span>
                )}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <Badge tone="brand">{waiting} waiting</Badge>
                <Badge tone="neutral">{remaining} left today</Badge>
                {lateBy >= 10 && (
                  <span
                    className="ml-auto inline-flex items-center gap-1 font-medium text-amber-700"
                    title="Started the current appointment late"
                  >
                    <Clock className="size-3" aria-hidden />+{lateBy}m
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
