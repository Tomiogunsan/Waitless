import { CalendarClock } from "lucide-react";
import { StatusBadge } from "@/shared/badge/appointment-status-badge";
import { Card, CardBody, CardHeader } from "@/shared/card/card";
import EmptyState from "@/shared/empty-state/empty-state";
import type { StaffAppointment } from "@/types/appointment";
import { isOnDate } from "@/utils/scheduling";
import { clinicToday, formatDate, formatTime } from "@/utils/time";

export function UpcomingCard({
  appointments,
}: {
  appointments: StaffAppointment[];
}) {
  const today = clinicToday();

  return (
    <Card className="lg:self-start">
      <CardHeader
        title="Upcoming"
        description={`${appointments.length} booked`}
      />
      <CardBody>
        {appointments.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing booked"
            className="py-6"
          />
        ) : (
          <ul className="space-y-3">
            {appointments.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-slate-200/80 p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {isOnDate(a.scheduledAt, today)
                        ? "Today"
                        : formatDate(a.scheduledAt, "weekday")}{" "}
                      · {formatTime(a.scheduledAt)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {a.physician.fullName}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-2 font-mono text-xs text-slate-400">
                  {a.reference}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
