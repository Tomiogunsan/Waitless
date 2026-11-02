import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UserX } from "lucide-react";
import { useMemo } from "react";
import { MedicalInfoCard } from "@/routes/_modules/physician/-components/medical-info-card";
import { buttonStyles } from "@/shared/button/button-styles";
import { Card } from "@/shared/card/card";
import EmptyState from "@/shared/empty-state/empty-state";
import { useMedicalInfo, useVisitHistory } from "@/hooks/use-consultation";
import { usePatient, usePatientAppointments } from "@/hooks/use-patients";
import { requireRole } from "@/utils/guards";
import { useRole } from "@/utils/session";
import { clinicDayRange, clinicToday } from "@/utils/time";
import { ProfileCard } from "./-components/profile-card";
import { UpcomingCard } from "./-components/upcoming-card";
import { VisitHistoryCard } from "./-components/visit-history-card";

const UPCOMING_STATUSES = ["scheduled", "checked_in", "in_progress"];

export const Route = createFileRoute("/_modules/patients/$patientId/")({
  beforeLoad: ({ context }) =>
    requireRole(context.session, ["front_desk", "physician", "admin"]),
  component: PatientProfilePage,
});

function PatientProfilePage() {
  const { patientId } = Route.useParams();
  const isPhysician = useRole() === "physician";
  const { data: patient, isPending, isError } = usePatient(patientId);
  const { data: appointments = [], isPending: loadingAppointments } =
    usePatientAppointments(patientId);
  const showClinical = isPhysician && Boolean(patient);
  const { data: medical = [] } = useMedicalInfo(showClinical ? [patientId] : []);
  const { data: visits = [], isPending: loadingVisits } = useVisitHistory(
    showClinical ? patientId : undefined,
  );

  const { upcoming, past } = useMemo(() => {
    const todayStart = clinicDayRange(clinicToday()).start;
    const isUpcoming = (a: (typeof appointments)[number]) =>
      UPCOMING_STATUSES.includes(a.status) && a.scheduledAt >= todayStart;
    return {
      upcoming: appointments.filter(isUpcoming).reverse(),
      past: appointments.filter((a) => !isUpcoming(a)),
    };
  }, [appointments]);

  if (isPending) {
    return <Card className="h-40 animate-pulse" aria-label="Loading patient" />;
  }

  // Physicians only get patients they treat, so this also covers "not yours".
  if (isError || !patient) {
    return (
      <EmptyState
        icon={UserX}
        title="Patient not found"
        description="This record may have been removed, or the link is wrong."
        action={
          <Link to="/patients" className={buttonStyles()}>
            All patients
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/patients"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All patients
      </Link>

      <ProfileCard patient={patient} canEdit={!isPhysician} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {isPhysician && medical[0] && <MedicalInfoCard info={medical[0]} />}
          <VisitHistoryCard
            isPhysician={isPhysician}
            visits={visits}
            appointments={past}
            loading={isPhysician ? loadingVisits : loadingAppointments}
          />
        </div>
        <UpcomingCard appointments={upcoming} />
      </div>
    </div>
  );
}
