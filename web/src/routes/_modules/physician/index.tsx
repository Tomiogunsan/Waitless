import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertOctagon,
  ArrowRight,
  Clock,
  Coffee,
  PlayCircle,
  Stethoscope,
  Timer,
  UserCheck,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/shared/badge/appointment-status-badge";
import Avatar from "@/shared/avatar/avatar";
import Button from "@/shared/button/button";
import { buttonStyles } from "@/shared/button/button-styles";
import { Card, CardBody, CardHeader } from "@/shared/card/card";
import Alert from "@/shared/alert/alert";
import EmptyState from "@/shared/empty-state/empty-state";
import LiveIndicator from "@/shared/live-indicator/live-indicator";
import PageHeader from "@/shared/page-header/page-header";
import StatTile from "@/shared/stat-tile/stat-tile";
import { cn } from "@/utils/cn";
import { greeting } from "@/utils/constants";
import { DEMO_TODAY, useDemoNow } from "@/utils/demo-clock";
import { requireRole } from "@/utils/guards";
import { useMockStaffId } from "@/utils/session";
import { isOnDate, overlaps } from "@/utils/scheduling";
import {
  APPOINTMENT_MINUTES,
  SLOT_TIMES,
  atClinicTime,
  formatDate,
  formatDuration,
  formatTime,
  minutesBetween,
} from "@/utils/time";
import { getMedicalInfo, getStaff } from "@/mocks/clinic";
import { appointmentStore, patientStore, useAppointments } from "@/mocks/store";
import type { Appointment } from "@/types/clinic";

export const Route = createFileRoute("/_modules/physician/")({
  beforeLoad: ({ context }) => requireRole(context.session, ["physician"]),
  component: PhysicianQueuePage,
});


function PhysicianQueuePage() {
  const ME = useMockStaffId()!;
  const now = useDemoNow(1000);
  const navigate = useNavigate();
  const all = useAppointments();
  const me = getStaff(ME)!;

  const mine = useMemo(
    () =>
      all
        .filter(
          (a) => a.physician_id === ME && isOnDate(a.scheduled_at, DEMO_TODAY),
        )
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [all, ME],
  );
  const current = mine.find((a) => a.status === "in_progress");
  const queue = mine
    .filter((a) => a.status === "checked_in")
    .sort((a, b) => a.checked_in_at!.localeCompare(b.checked_in_at!));
  const seen = mine.filter((a) => a.status === "completed").length;
  const remaining = mine.filter((a) => a.status === "scheduled").length;
  const overrun = current
    ? minutesBetween(
        new Date(
          new Date(current.scheduled_at).getTime() +
            APPOINTMENT_MINUTES * 60_000,
        ),
        now,
      )
    : 0;

  const start = (appointment: Appointment) => {
    if (current) {
      toast.error("Finish your current consultation first", {
        description: "You can only see one patient at a time.",
      });
      return;
    }
    appointmentStore.update(appointment.id, {
      status: "in_progress",
      actual_started_at: now.toISOString(),
    });
    void navigate({
      to: "/physician/consultation/$appointmentId",
      params: { appointmentId: appointment.id },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<LiveIndicator label={`Live · ${formatTime(now)}`} />}
        title={`${greeting(now)}, ${me.full_name.replace(/^Dr\.\s+(\w+).*/, "Dr. $1")}`}
        description={`${formatDate(DEMO_TODAY)} · General Medicine`}
      />

      {overrun > 0 && (
        <Alert
          tone="warning"
          icon={Clock}
          title={`You're running ${formatDuration(overrun)} over`}
        >
          When you complete this consultation, your later appointments move back
          by the same amount where possible. Any that can't be moved are flagged
          for the front desk.
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-4">
        <StatTile
          label="Waiting"
          value={queue.length}
          icon={Users}
          hint={
            queue[0]
              ? `Longest ${formatDuration(minutesBetween(queue[0].checked_in_at!, now))}`
              : "No one waiting"
          }
        />
        <StatTile
          label="Seen today"
          value={seen}
          icon={UserCheck}
          hint="Completed consultations"
        />
        <StatTile
          label="Still to arrive"
          value={remaining}
          icon={Clock}
          hint="Booked for later today"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {current ? (
            <CurrentConsultation appointment={current} now={now} />
          ) : (
            <NoCurrentConsultation next={queue[0]} onStart={start} />
          )}

          <Card>
            <CardHeader
              title="Waiting room"
              description="Checked-in patients, in order of arrival."
            />
            {queue.length === 0 ? (
              <EmptyState
                icon={Coffee}
                title="No one is waiting"
                description="Patients appear here the moment the front desk checks them in."
                className="pt-2"
              />
            ) : (
              <ol className="divide-y divide-slate-100 border-t border-slate-100">
                {queue.map((a, index) => {
                  const patient = patientStore.get(a.patient_id)!;
                  const allergies = getMedicalInfo(a.patient_id)?.allergies;
                  const hasAllergy =
                    allergies &&
                    allergies !== "None known" &&
                    allergies !== "Unknown";
                  const waited = minutesBetween(a.checked_in_at!, now);
                  return (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center gap-4 px-5 py-4"
                    >
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700"
                        aria-label={`Position ${index + 1}`}
                      >
                        {index + 1}
                      </span>
                      <Avatar name={patient.full_name} size="md" />
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/patients/$patientId"
                          params={{ patientId: patient.id }}
                          className="font-semibold text-slate-900 hover:text-brand-700 hover:underline"
                        >
                          {patient.full_name}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>Booked {formatTime(a.scheduled_at)}</span>
                          <span>Arrived {formatTime(a.checked_in_at!)}</span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-medium",
                              waited >= 20
                                ? "text-amber-700"
                                : "text-slate-600",
                            )}
                          >
                            <Timer className="size-3" aria-hidden />
                            Waiting {formatDuration(waited)}
                          </span>
                          {hasAllergy && (
                            <span className="inline-flex items-center gap-1 font-medium text-red-600">
                              <AlertOctagon className="size-3" aria-hidden />
                              Allergy
                            </span>
                          )}
                        </p>
                      </div>
                      <Button
                        variant={
                          index === 0 && !current ? "primary" : "secondary"
                        }
                        size="sm"
                        onClick={() => start(a)}
                        disabled={Boolean(current)}
                      >
                        <PlayCircle aria-hidden />
                        Start consultation
                      </Button>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        <DayTimeline appointments={mine} now={now} />
      </div>
    </div>
  );
}

function CurrentConsultation({
  appointment,
  now,
}: {
  appointment: Appointment;
  now: Date;
}) {
  const patient = patientStore.get(appointment.patient_id)!;
  const elapsed =
    (now.getTime() - new Date(appointment.actual_started_at!).getTime()) /
    60_000;
  const progress = Math.min(1, elapsed / 35);
  const over = elapsed > 35;

  return (
    <section
      aria-label="Current consultation"
      className="relative overflow-hidden rounded-2xl bg-brand-600 p-6 text-white shadow-lg shadow-brand-600/20"
    >
      <div
        aria-hidden
        className="absolute -top-24 -right-24 size-64 rounded-full bg-white/10"
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar
            name={patient.full_name}
            size="lg"
            className="bg-white/15 text-white ring-2 ring-white/30"
          />
          <div>
            <p className="flex items-center gap-1.5 text-sm text-brand-100">
              <Stethoscope className="size-4" aria-hidden />
              In consultation
            </p>
            <p className="text-xl font-semibold">{patient.full_name}</p>
            <p className="text-sm text-brand-100">
              Booked for {formatTime(appointment.scheduled_at)} · started{" "}
              {formatTime(appointment.actual_started_at!)}
            </p>
          </div>
        </div>
        <Link
          to="/physician/consultation/$appointmentId"
          params={{ appointmentId: appointment.id }}
          className={cn(
            buttonStyles({ variant: "secondary" }),
            "text-brand-700",
          )}
        >
          Open consultation
          <ArrowRight aria-hidden />
        </Link>
      </div>
      <div className="relative mt-6">
        <div className="flex justify-between text-xs text-brand-100">
          <span className="tabular font-semibold text-white">
            {formatDuration(elapsed)} elapsed
          </span>
          <span>35 min with patient · 5 min rest</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-white/20"
          role="progressbar"
          aria-valuenow={Math.round(elapsed)}
          aria-valuemin={0}
          aria-valuemax={35}
          aria-label="Consultation time"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              over ? "bg-amber-300" : "bg-white",
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function NoCurrentConsultation({
  next,
  onStart,
}: {
  next?: Appointment;
  onStart: (a: Appointment) => void;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-6">
      <div>
        <p className="text-sm font-semibold text-slate-900">You're free</p>
        <p className="text-sm text-slate-500">
          {next
            ? `${patientStore.get(next.patient_id)?.full_name} is next in the waiting room.`
            : "No one is waiting right now."}
        </p>
      </div>
      {next && (
        <Button onClick={() => onStart(next)}>
          <PlayCircle aria-hidden />
          Start with{" "}
          {patientStore.get(next.patient_id)?.full_name.split(" ")[0]}
        </Button>
      )}
    </section>
  );
}

type TimelineItem =
  | { kind: "appointment"; at: string; appointment: Appointment }
  | { kind: "free"; at: string }
  | { kind: "lunch"; at: string };

/** The physician's whole day: booked appointments, free slots and lunch. */
function DayTimeline({
  appointments,
  now,
}: {
  appointments: Appointment[];
  now: Date;
}) {
  const items: TimelineItem[] = [
    ...appointments
      .filter((a) => a.status !== "cancelled")
      .map((a) => ({
        kind: "appointment" as const,
        at: a.scheduled_at,
        appointment: a,
      })),
    ...SLOT_TIMES.map((t) => atClinicTime(DEMO_TODAY, t).toISOString())
      .filter(
        (at) =>
          !appointments.some(
            (a) => a.status !== "cancelled" && overlaps(a.scheduled_at, at),
          ),
      )
      .map((at) => ({ kind: "free" as const, at })),
    {
      kind: "lunch" as const,
      at: atClinicTime(DEMO_TODAY, "12:00").toISOString(),
    },
  ].sort((a, b) => a.at.localeCompare(b.at));

  const nowIso = now.toISOString();
  const nowIndex = items.findIndex((item) => item.at > nowIso);

  return (
    <Card className="xl:self-start">
      <CardHeader
        title="Your day"
        description={`${appointments.filter((a) => a.status !== "cancelled").length} appointments`}
      />
      <CardBody className="pt-0">
        <ol className="relative">
          {items.map((item, index) => (
            <li key={`${item.kind}-${item.at}`}>
              {index === nowIndex && (
                <div
                  className="my-1 flex items-center gap-2"
                  aria-label={`Now, ${formatTime(now)}`}
                >
                  <span className="tabular w-12 text-right text-[11px] font-semibold text-red-500">
                    {formatTime(now)}
                  </span>
                  <span
                    className="size-2 rounded-full bg-red-500"
                    aria-hidden
                  />
                  <span className="h-px flex-1 bg-red-300" aria-hidden />
                </div>
              )}
              <TimelineRow item={item} past={item.at < nowIso} />
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}

function TimelineRow({ item, past }: { item: TimelineItem; past: boolean }) {
  const time = (
    <span className="tabular w-12 shrink-0 pt-2 text-right text-xs font-medium text-slate-400">
      {formatTime(item.at)}
    </span>
  );

  if (item.kind === "lunch") {
    return (
      <div className="flex gap-3 py-1">
        {time}
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-[repeating-linear-gradient(135deg,var(--color-slate-50),var(--color-slate-50)_6px,white_6px,white_12px)] px-3 py-2 text-xs font-medium text-slate-500 ring-1 ring-slate-100 ring-inset">
          <UtensilsCrossed className="size-3.5" aria-hidden />
          Lunch break · until 13:00
        </div>
      </div>
    );
  }

  if (item.kind === "free") {
    return (
      <div className="flex gap-3 py-1">
        {time}
        <div className="flex-1 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">
          Free
        </div>
      </div>
    );
  }

  const a = item.appointment;
  const patient = patientStore.get(a.patient_id)!;
  const active = a.status === "in_progress";
  return (
    <div className="flex gap-3 py-1">
      {time}
      <div
        className={cn(
          "flex flex-1 items-center justify-between gap-2 rounded-lg px-3 py-2",
          active
            ? "bg-violet-50 ring-1 ring-violet-200 ring-inset"
            : past
              ? "bg-slate-50"
              : "bg-white ring-1 ring-slate-200 ring-inset",
        )}
      >
        <span
          className={cn(
            "truncate text-sm font-medium",
            past && !active ? "text-slate-500" : "text-slate-900",
          )}
        >
          {patient.full_name}
        </span>
        <StatusBadge status={a.status} />
      </div>
    </div>
  );
}
