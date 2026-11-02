import { History } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/shared/card/card";
import { useVisitHistory } from "@/hooks/use-consultation";
import { formatDate } from "@/utils/time";

export function PreviousVisits({
  patientId,
  currentAppointmentId,
}: {
  patientId: string;
  currentAppointmentId: string;
}) {
  const { data: history = [], isPending } = useVisitHistory(patientId);
  const visits = history.filter((v) => v.appointmentId !== currentAppointmentId);

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <History className="size-4 text-brand-600" aria-hidden />
            Previous visits
          </span>
        }
      />
      <CardBody>
        {isPending ? (
          <div className="h-16 animate-pulse rounded-xl bg-slate-100" aria-label="Loading previous visits" />
        ) : visits.length === 0 ? (
          <p className="text-sm text-slate-500">
            This is the patient's first visit.
          </p>
        ) : (
          <ul className="space-y-3">
            {visits.map((v) => (
              <li key={v.appointmentId}>
                <details className="group rounded-xl border border-slate-200/80 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-start justify-between gap-2 rounded-xl p-3 hover:bg-slate-50">
                    <span>
                      <span className="block text-sm font-medium text-slate-900">
                        {v.diagnosis}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {formatDate(v.visitAt, "short")} · {v.physicianName}
                      </span>
                    </span>
                    <span className="mt-1 text-xs text-brand-600 group-open:hidden">
                      Show
                    </span>
                    <span className="mt-1 hidden text-xs text-brand-600 group-open:inline">
                      Hide
                    </span>
                  </summary>
                  <dl className="space-y-2 border-t border-slate-100 p-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">Symptoms</dt>
                      <dd className="text-slate-800">{v.symptoms}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Prescription</dt>
                      <dd className="text-slate-800">
                        {v.prescription ?? "None"}
                      </dd>
                    </div>
                  </dl>
                </details>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
