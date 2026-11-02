import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { MedicalInfoCard } from "@/routes/_modules/physician/-components/medical-info-card";
import { buttonStyles } from "@/shared/button/button-styles";
import { Card, CardBody, CardHeader } from "@/shared/card/card";
import EmptyState from "@/shared/empty-state/empty-state";
import { useAppointment } from "@/hooks/use-appointments";
import { useMedicalInfo } from "@/hooks/use-consultation";
import { formatPhone } from "@/utils/format";
import { requireRole } from "@/utils/guards";
import { ConsultationHeader } from "./-components/consultation-header";
import { NoteForm } from "./-components/note-form";
import { PreviousVisits } from "./-components/previous-visits";
import { StartPanel } from "./-components/start-panel";

export const Route = createFileRoute(
  "/_modules/physician/consultation/$appointmentId/",
)({
  beforeLoad: ({ context }) => requireRole(context.session, ["physician"]),
  component: ConsultationPage,
});

function ConsultationPage() {
  const { appointmentId } = Route.useParams();
  const { data: appointment, isPending, isError } = useAppointment(appointmentId);
  const { data: medical = [] } = useMedicalInfo(
    appointment ? [appointment.patient.id] : [],
  );

  if (isPending) {
    return <Card className="h-28 animate-pulse" aria-label="Loading consultation" />;
  }

  // The database only returns a physician's own appointments.
  if (isError || !appointment) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Appointment not found"
        description="It may not exist, or it isn't assigned to you."
        action={
          <Link to="/physician" className={buttonStyles()}>
            Back to my queue
          </Link>
        }
      />
    );
  }

  const { patient } = appointment;

  return (
    <div className="space-y-6">
      <Link
        to="/physician"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        My queue
      </Link>

      <ConsultationHeader appointment={appointment} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {appointment.status === "checked_in" && (
            <StartPanel appointment={appointment} />
          )}
          {(appointment.status === "in_progress" ||
            appointment.status === "completed") && (
            <NoteForm appointment={appointment} />
          )}
        </div>

        <aside className="space-y-6">
          {medical[0] && <MedicalInfoCard info={medical[0]} />}
          <Card>
            <CardHeader title="Contact" />
            <CardBody className="space-y-1 text-sm text-slate-600">
              <p className="tabular">{formatPhone(patient.phone)}</p>
              <p>{patient.email ?? "No email on file"}</p>
            </CardBody>
          </Card>
          <PreviousVisits
            patientId={patient.id}
            currentAppointmentId={appointment.id}
          />
        </aside>
      </div>
    </div>
  );
}
