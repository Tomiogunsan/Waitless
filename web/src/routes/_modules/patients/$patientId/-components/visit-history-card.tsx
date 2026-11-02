import { ClipboardList, Lock } from "lucide-react";
import { StatusBadge } from "@/shared/badge/appointment-status-badge";
import { Card, CardBody, CardHeader } from "@/shared/card/card";
import EmptyState from "@/shared/empty-state/empty-state";
import type { StaffAppointment } from "@/types/appointment";
import type { PastVisit } from "@/types/consultation";
import { formatDate, formatTime } from "@/utils/time";

// Physicians see every visit's notes, including colleagues'. Everyone else
// sees past appointments and their outcome, without clinical notes.
export function VisitHistoryCard({
  isPhysician,
  visits,
  appointments,
  loading,
}: {
  isPhysician: boolean;
  visits: PastVisit[];
  appointments: StaffAppointment[];
  loading: boolean;
}) {
  const empty = isPhysician ? visits.length === 0 : appointments.length === 0;

  return (
    <Card>
      <CardHeader
        title="Visit history"
        description={
          isPhysician
            ? "Notes from every visit, including colleagues'."
            : "Past appointments and their outcome."
        }
      />
      <CardBody>
        {!isPhysician && (
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <Lock className="size-3.5" aria-hidden />
            Clinical notes are only visible to physicians.
          </p>
        )}
        {loading ? (
          <div
            className="h-24 animate-pulse rounded-xl bg-slate-100"
            aria-label="Loading visit history"
          />
        ) : empty ? (
          <EmptyState
            icon={ClipboardList}
            title="No previous visits"
            className="py-6"
          />
        ) : (
          <ol className="relative space-y-6 border-l border-slate-200 pl-6">
            {isPhysician
              ? visits.map((v) => (
                  <TimelineItem
                    key={v.appointmentId}
                    title={formatDate(v.visitAt)}
                    subtitle={`${formatTime(v.visitAt)} · ${v.physicianName}`}
                  >
                    <dl className="mt-3 grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-xs font-medium text-slate-500">
                          Symptoms
                        </dt>
                        <dd className="mt-0.5 text-slate-800">{v.symptoms}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500">
                          Diagnosis
                        </dt>
                        <dd className="mt-0.5 font-medium text-slate-900">
                          {v.diagnosis}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500">
                          Prescription
                        </dt>
                        <dd className="mt-0.5 text-slate-800">
                          {v.prescription ?? "None"}
                        </dd>
                      </div>
                    </dl>
                  </TimelineItem>
                ))
              : appointments.map((a) => (
                  <TimelineItem
                    key={a.id}
                    title={formatDate(a.scheduledAt)}
                    subtitle={`${formatTime(a.scheduledAt)} · ${a.physician.fullName} · ${a.department.name}`}
                    badge={<StatusBadge status={a.status} />}
                  >
                    {a.cancellationReason && (
                      <p className="mt-1 text-sm text-slate-500 italic">
                        "{a.cancellationReason}"
                      </p>
                    )}
                  </TimelineItem>
                ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}

function TimelineItem({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="relative">
      <span
        className="absolute top-1 -left-[31px] size-3 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200"
        aria-hidden
      />
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {badge}
      </div>
      <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      {children}
    </li>
  );
}
