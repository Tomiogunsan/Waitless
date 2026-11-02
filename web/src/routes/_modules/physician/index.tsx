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
import { requireRole } from "@/utils/guards";
import { useCurrentUser } from "@/utils/session";
import { overlaps } from "@/utils/scheduling";
import { hasKnownAllergy } from "@/utils/medical";
import {
  APPOINTMENT_MINUTES,
  SLOT_TIMES,
  atClinicTime,
  clinicToday,
  formatDate,
  formatDuration,
  formatTime,
  minutesBetween,
} from "@/utils/time";
import { usePhysicianDay } from "@/hooks/use-appointments";
import { useDepartments } from "@/hooks/use-booking";
import { useMedicalInfo, useStartConsultation } from "@/hooks/use-consultation";
import { useNow } from "@/hooks/use-now";
import type { StaffAppointment } from "@/types/appointment";

export const Route = createFileRoute("/_modules/physician/")({
  beforeLoad: ({ context }) => requireRole(context.session, ["physician"]),
  component: PhysicianQueuePage,
});


function PhysicianQueuePage() {
  const me = useCurrentUser()!;
  const now = useNow(1000);
  const navigate = useNavigate();
  const date = useMemo(() => clinicToday(), []);
  const { data: mine = [], isError } = usePhysicianDay(me.id, date);
  const { data: departments = [] } = useDepartments();
  const { mutate: startConsultation, isPending: starting } =
    useStartConsultation();

  const current = mine.find((a) => a.status === "in_progress");
  const queue = mine
    .filter((a) => a.status === "checked_in")
    .sort((a, b) => a.checkedInAt!.localeCompare(b.checkedInAt!));
  const { data: medical = [] } = useMedicalInfo(
    queue.map((a) => a.patient.id),
  );
  const department = departments.find((d) => d.id === me.departmentId)?.name;
  const seen = mine.filter((a) => a.status === "completed").length;
  const remaining = mine.filter((a) => a.status === "scheduled").length;
  const overrun = current
    ? minutesBetween(
        new Date(
          new Date(current.scheduledAt).getTime() +
            APPOINTMENT_MINUTES * 60_000,
        ),
        now,
      )
    : 0;

  const start = (appointment: StaffAppointment) => {
    if (current) {
      toast.error("Finish your current consultation first", {
        description: "You can only see one patient at a time.",
      });
      return;
    }
    startConsultation(appointment.id, {
      onSuccess: () =>
        void navigate({
          to: "/physician/consultation/$appointmentId",
          params: { appointmentId: appointment.id },
        }),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<LiveIndicator label={`Live · ${formatTime(now)}`} />}
        title={`${greeting(now)}, ${me.fullName.replace(/^Dr\.\s+(\w+).*/, "Dr. $1")}`}
        description={[formatDate(date), department].filter(Boolean).join(" · ")}
      />

      {isError && (
        <Alert
          tone="danger"
          icon={AlertOctagon}
          title="We couldn't load your appointments. Refresh to try again."
        />
      )}

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
              ? `Longest ${formatDuration(minutesBetween(queue[0].checkedInAt!, now))}`
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
            <NoCurrentConsultation
              next={queue[0]}
              onStart={start}
              starting={starting}
            />
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
                  const { patient } = a;
                  const hasAllergy = hasKnownAllergy(
                    medical.find((m) => m.patientId === patient.id)?.allergies,
                  );
                  const waited = minutesBetween(a.checkedInAt!, now);
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
                      <Avatar name={patient.fullName} size="md" />
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/patients/$patientId"
                          params={{ patientId: patient.id }}
                          className="font-semibold text-slate-900 hover:text-brand-700 hover:underline"
                        >
                          {patient.fullName}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>Booked {formatTime(a.scheduledAt)}</span>
                          <span>Arrived {formatTime(a.checkedInAt!)}</span>
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
                        disabled={Boolean(current) || starting}
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

        <DayTimeline appointments={mine} date={date} now={now} />
      </div>
    </div>
  );
}

function CurrentConsultation({
  appointment,
  now,
}: {
  appointment: StaffAppointment;
  now: Date;
}) {
  const { patient } = appointment;
  const elapsed =
    (now.getTime() - new Date(appointment.startedAt!).getTime()) / 60_000;
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
            name={patient.fullName}
            size="lg"
            className="bg-white/15 text-white ring-2 ring-white/30"
          />
          <div>
            <p className="flex items-center gap-1.5 text-sm text-brand-100">
              <Stethoscope className="size-4" aria-hidden />
              In consultation
            </p>
            <p className="text-xl font-semibold">{patient.fullName}</p>
            <p className="text-sm text-brand-100">
              Booked for {formatTime(appointment.scheduledAt)} · started{" "}
              {formatTime(appointment.startedAt!)}
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
  starting,
}: {
  next?: StaffAppointment;
  onStart: (a: StaffAppointment) => void;
  starting: boolean;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-6">
      <div>
        <p className="text-sm font-semibold text-slate-900">You're free</p>
        <p className="text-sm text-slate-500">
          {next
            ? `${next.patient.fullName} is next in the waiting room.`
            : "No one is waiting right now."}
        </p>
      </div>
      {next && (
        <Button onClick={() => onStart(next)} loading={starting}>
          <PlayCircle aria-hidden />
          Start with {next.patient.fullName.split(" ")[0]}
        </Button>
      )}
    </section>
  );
}

type TimelineItem =
  | { kind: "appointment"; at: string; appointment: StaffAppointment }
  | { kind: "free"; at: string }
  | { kind: "lunch"; at: string };

/** The physician's whole day: booked appointments, free slots and lunch. */
function DayTimeline({
  appointments,
  date,
  now,
}: {
  appointments: StaffAppointment[];
  date: string;
  now: Date;
}) {
  const items: TimelineItem[] = [
    ...appointments
      .filter((a) => a.status !== "cancelled")
      .map((a) => ({
        kind: "appointment" as const,
        at: a.scheduledAt,
        appointment: a,
      })),
    ...SLOT_TIMES.map((t) => atClinicTime(date, t).toISOString())
      .filter(
        (at) =>
          !appointments.some(
            (a) => a.status !== "cancelled" && overlaps(a.scheduledAt, at),
          ),
      )
      .map((at) => ({ kind: "free" as const, at })),
    {
      kind: "lunch" as const,
      at: atClinicTime(date, "12:00").toISOString(),
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
          {a.patient.fullName}
        </span>
        <StatusBadge status={a.status} />
      </div>
    </div>
  );
}
