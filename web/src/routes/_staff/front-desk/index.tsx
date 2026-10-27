import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRightLeft,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Plus,
  Stethoscope,
  UserCheck,
  UserRound,
  UserX,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/appointment-status";
import {
  CancelAppointmentDialog,
  NewAppointmentDialog,
  ReassignDialog,
  RescheduleDialog,
} from "@/components/front-desk/dialogs";
import Avatar from "@/shared/avatar/avatar";
import Button from "@/shared/button/button";
import Select from "@/shared/select/select";
import Badge from "@/shared/badge/badge";
import Alert from "@/shared/alert/alert";
import LiveIndicator from "@/shared/live-indicator/live-indicator";
import PageHeader from "@/shared/page-header/page-header";
import Segmented from "@/shared/segmented/segmented";
import StatTile from "@/shared/stat-tile/stat-tile";
import { cn } from "@/lib/cn";
import { DEMO_TODAY, demoNow, useDemoNow } from "@/lib/demo-clock";
import { formatPhone } from "@/lib/format";
import { requireRole } from "@/lib/guards";
import { isOnDate, newReferenceCode } from "@/lib/scheduling";
import {
  atClinicTime,
  formatDate,
  formatDuration,
  formatTime,
  minutesBetween,
} from "@/lib/time";
import { getDepartment, getStaff, physicians } from "@/mocks/clinic";
import { appointmentStore, patientStore, useAppointments } from "@/mocks/store";
import type { ITableHead, ITableMenuOption } from "@/shared/table/interface";
import Table from "@/shared/table/table";
import TableEmptyState from "@/shared/table/table-empty-state";
import type { Appointment, AppointmentStatus } from "@/types/clinic";

export const Route = createFileRoute("/_staff/front-desk/")({
  beforeLoad: ({ context }) =>
    requireRole(context.session, ["front_desk", "admin"]),
  component: FrontDeskPage,
});

type Filter = "all" | "upcoming" | "waiting" | "with_doctor" | "done";

const FILTER_STATUSES: Record<Filter, AppointmentStatus[] | null> = {
  all: null,
  upcoming: ["scheduled"],
  waiting: ["checked_in"],
  with_doctor: ["in_progress"],
  done: ["completed", "cancelled", "no_show"],
};

const isDone = (a: Appointment) =>
  a.status === "completed" || a.status === "cancelled" || a.status === "no_show";

type DialogState = {
  kind: "reassign" | "reschedule" | "cancel";
  appointment: Appointment;
} | null;

function FrontDeskPage() {
  const now = useDemoNow();
  const all = useAppointments();
  const today = useMemo(
    () =>
      all
        .filter((a) => isOnDate(a.scheduled_at, DEMO_TODAY))
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [all],
  );

  const [filter, setFilter] = useState<Filter>("all");
  const [doctor, setDoctor] = useState("all");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [newOpen, setNewOpen] = useState(false);
  const fresh = useSimulatedRealtimeBooking();
  const navigate = useNavigate();

  const counts = useMemo(() => {
    const by = (statuses: AppointmentStatus[]) =>
      today.filter((a) => statuses.includes(a.status)).length;
    return {
      all: today.length,
      upcoming: by(["scheduled"]),
      waiting: by(["checked_in"]),
      with_doctor: by(["in_progress"]),
      done: by(["completed", "cancelled", "no_show"]),
      completed: by(["completed"]),
      missed: by(["no_show", "cancelled"]),
    };
  }, [today]);

  const visible = useMemo(() => {
    const statuses = FILTER_STATUSES[filter];
    const q = query.trim().toLowerCase();
    return today.filter((a) => {
      if (statuses && !statuses.includes(a.status)) return false;
      if (doctor !== "all" && a.physician_id !== doctor) return false;
      if (!q) return true;
      const patient = patientStore.get(a.patient_id)!;
      return (
        patient.full_name.toLowerCase().includes(q) ||
        formatPhone(patient.phone)
          .replace(/\s/g, "")
          .includes(q.replace(/\s/g, "")) ||
        a.reference_code.toLowerCase().includes(q)
      );
    });
  }, [today, filter, doctor, query]);

  const checkIn = (a: Appointment) => {
    const patient = patientStore.get(a.patient_id)!;
    const previous = { status: a.status, checked_in_at: a.checked_in_at };
    appointmentStore.update(a.id, {
      status: "checked_in",
      checked_in_at: now.toISOString(),
    });
    toast.success(`${patient.full_name} checked in`, {
      description: `Added to ${getStaff(a.physician_id)?.full_name}'s queue`,
      action: {
        label: "Undo",
        onClick: () => appointmentStore.update(a.id, previous),
      },
    });
  };

  const markNoShow = (a: Appointment) => {
    appointmentStore.update(a.id, { status: "no_show" });
    toast(`${patientStore.get(a.patient_id)?.full_name} marked as a no-show`, {
      action: {
        label: "Undo",
        onClick: () => appointmentStore.update(a.id, { status: "scheduled" }),
      },
    });
  };

  const isOpen = (a: Appointment) =>
    a.status === "scheduled" || a.status === "checked_in";

  const menuOptions: ITableMenuOption<Appointment>[] = [
    {
      menuTitle: "Check in",
      icon: UserCheck,
      action: checkIn,
      hide: (a) => a.status !== "scheduled",
    },
    {
      menuTitle: "Reschedule",
      icon: CalendarClock,
      action: (a) => setDialog({ kind: "reschedule", appointment: a }),
      hide: (a) => !isOpen(a),
    },
    {
      menuTitle: "Reassign doctor",
      icon: ArrowRightLeft,
      action: (a) => setDialog({ kind: "reassign", appointment: a }),
      hide: (a) => !isOpen(a),
    },
    {
      menuTitle: "Mark as no-show",
      icon: UserX,
      action: markNoShow,
      hide: (a) => a.status !== "scheduled",
      disabled: (a) => minutesBetween(a.scheduled_at, now) < 15,
      disabledReason: "after +15 min",
    },
    {
      menuTitle: "View patient",
      icon: UserRound,
      action: (a) =>
        void navigate({
          to: "/patients/$patientId",
          params: { patientId: a.patient_id },
        }),
    },
    {
      menuTitle: "Cancel appointment",
      icon: XCircle,
      tone: "danger",
      separatorBefore: true,
      action: (a) => setDialog({ kind: "cancel", appointment: a }),
      hide: (a) => !isOpen(a),
    },
  ];

  const columns: ITableHead<Appointment>[] = [
    {
      label: "Time",
      accessor: "scheduled_at",
      render: (a) => (
        <div>
          <span
            className={cn(
              "tabular font-semibold",
              isDone(a) ? "text-slate-400" : "text-slate-900",
            )}
          >
            {formatTime(a.scheduled_at)}
          </span>
          {a.original_scheduled_at !== a.scheduled_at && (
            <span
              className="tabular block text-xs text-slate-400 line-through"
              title="Originally booked time"
            >
              {formatTime(a.original_scheduled_at)}
            </span>
          )}
        </div>
      ),
    },
    {
      label: "Patient",
      accessor: "patient_id",
      render: (a) => {
        const patient = patientStore.get(a.patient_id)!;
        return (
          <div className="flex min-w-56 items-center gap-3">
            <Avatar
              name={patient.full_name}
              className={cn(isDone(a) && "opacity-50")}
            />
            <div className="min-w-0">
              <Link
                to="/patients/$patientId"
                params={{ patientId: patient.id }}
                className={cn(
                  "block truncate font-medium hover:text-brand-700 hover:underline",
                  isDone(a) ? "text-slate-500" : "text-slate-900",
                )}
              >
                {patient.full_name}
              </Link>
              <span className="tabular block truncate text-xs text-slate-500">
                {formatPhone(patient.phone)} ·{" "}
                <span className="font-mono">{a.reference_code}</span>
              </span>
            </div>
            {fresh.has(a.id) && (
              <Badge tone="brand" variant="solid">
                New
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      label: "Doctor",
      accessor: "physician_id",
      render: (a) => (
        <div className="whitespace-nowrap">
          <span
            className={cn(
              "block font-medium",
              isDone(a) ? "text-slate-500" : "text-slate-700",
            )}
          >
            {getStaff(a.physician_id)?.full_name}
          </span>
          <span className="block text-xs text-slate-500">
            {getDepartment(a.department_id)?.name}
          </span>
        </div>
      ),
    },
    {
      label: "Status",
      accessor: "status",
      render: (a) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={a.status} />
          {a.reschedule_needs_review && a.status === "scheduled" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap text-amber-700">
              <AlertTriangle className="size-3" aria-hidden /> Needs review
            </span>
          )}
        </div>
      ),
    },
    {
      label: "Waiting",
      accessor: "checked_in_at",
      render: (a) => <WaitCell appointment={a} now={now} />,
    },
    {
      label: "Arrival",
      accessor: null,
      align: "right",
      render: (a) =>
        a.status === "scheduled" ? (
          <Button size="sm" variant="soft" onClick={() => checkIn(a)}>
            <UserCheck aria-hidden />
            Check in
          </Button>
        ) : null,
    },
  ];

  const needsReview = today.filter(
    (a) => a.reschedule_needs_review && a.status === "scheduled",
  );
  const avgWait = (() => {
    const waiting = today.filter(
      (a) => a.status === "checked_in" && a.checked_in_at,
    );
    if (!waiting.length) return 0;
    return (
      waiting.reduce(
        (sum, a) => sum + minutesBetween(a.checked_in_at!, now),
        0,
      ) / waiting.length
    );
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<LiveIndicator label={`Live · ${formatTime(now)}`} />}
        title="Today"
        description={formatDate(DEMO_TODAY)}
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <Plus aria-hidden />
            New appointment
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile
          label="Expected today"
          value={counts.all - counts.missed}
          icon={CalendarDays}
          hint={`${counts.upcoming} still to arrive`}
        />
        <StatTile
          label="In the waiting room"
          value={counts.waiting}
          icon={Users}
          hint={
            counts.waiting
              ? `Average wait ${formatDuration(avgWait)}`
              : "No one waiting"
          }
        />
        <StatTile
          label="With a doctor"
          value={counts.with_doctor}
          icon={Stethoscope}
          hint={`${counts.completed} seen so far`}
        />
        <StatTile
          label="No-shows & cancellations"
          value={counts.missed}
          icon={UserX}
          hint="Slots released for rebooking"
        />
      </div>

      {needsReview.length > 0 && (
        <Alert
          tone="warning"
          icon={AlertTriangle}
          title={`${needsReview.length} appointment${needsReview.length > 1 ? "s" : ""} could not be moved automatically after a delay`}
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setDialog({ kind: "reschedule", appointment: needsReview[0]! })
              }
            >
              Resolve
            </Button>
          }
        >
          {needsReview
            .map(
              (a) =>
                `${patientStore.get(a.patient_id)?.full_name} (${formatTime(a.scheduled_at)}, ${getStaff(a.physician_id)?.full_name})`,
            )
            .join(" · ")}
          . Reschedule or reassign them so the patients aren't kept waiting.
        </Alert>
      )}

      <DoctorBoard today={today} now={now} />

      <section aria-labelledby="appointments-heading" className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2
              id="appointments-heading"
              className="text-base font-semibold text-slate-900"
            >
              Appointments
            </h2>
            <p className="text-sm text-slate-500">
              Updates live as patients book, arrive and are seen.
            </p>
          </div>
          <Segmented
            label="Filter by status"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "upcoming", label: "Upcoming", count: counts.upcoming },
              { value: "waiting", label: "Waiting", count: counts.waiting },
              {
                value: "with_doctor",
                label: "With doctor",
                count: counts.with_doctor,
              },
              { value: "done", label: "Done", count: counts.done },
            ]}
          />
        </div>

        <Table<Appointment>
          tableHeads={columns}
          dataTableSource={visible}
          showSearch
          searchPlaceholder="Search name, phone or reference"
          searchValue={query}
          onSearch={setQuery}
          toolbar={
            <Select
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              aria-label="Filter by doctor"
              className="sm:w-52"
            >
              <option value="all">All doctors</option>
              {physicians().map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </Select>
          }
          showMenu
          menuOptions={menuOptions}
          rowLabel={(a) => patientStore.get(a.patient_id)!.full_name}
          rowClassName={(a) =>
            fresh.has(a.id) ? "animate-fade-in bg-brand-50/70" : undefined
          }
          tableEmptyState={
            <TableEmptyState
              variant="no-results"
              icon={CalendarClock}
              title="No appointments match"
              description="Try another status, doctor or search."
            />
          }
        />
      </section>

      {dialog?.kind === "reassign" && (
        <ReassignDialog
          appointment={dialog.appointment}
          onOpenChange={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "reschedule" && (
        <RescheduleDialog
          appointment={dialog.appointment}
          onOpenChange={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "cancel" && (
        <CancelAppointmentDialog
          appointment={dialog.appointment}
          onOpenChange={() => setDialog(null)}
        />
      )}
      <NewAppointmentDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

function WaitCell({
  appointment: a,
  now,
}: {
  appointment: Appointment;
  now: Date;
}) {
  if (a.status === "checked_in" && a.checked_in_at) {
    const minutes = minutesBetween(a.checked_in_at, now);
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
  if (a.status === "in_progress" && a.actual_started_at) {
    return (
      <span className="text-violet-700">
        In for {formatDuration(minutesBetween(a.actual_started_at, now))}
      </span>
    );
  }
  if (a.status === "completed" && a.checked_in_at && a.actual_started_at) {
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-400">
        <CheckCircle2 className="size-3.5" aria-hidden />
        Waited{" "}
        {formatDuration(minutesBetween(a.checked_in_at, a.actual_started_at))}
      </span>
    );
  }
  return <span className="text-slate-300">—</span>;
}

/** Each doctor at a glance: who they're with, who's waiting, how late they're running. */
function DoctorBoard({ today, now }: { today: Appointment[]; now: Date }) {
  const doctors = physicians().filter((p) =>
    today.some((a) => a.physician_id === p.id),
  );

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
          const mine = today.filter((a) => a.physician_id === doctor.id);
          const current = mine.find((a) => a.status === "in_progress");
          const waiting = mine.filter((a) => a.status === "checked_in").length;
          const lateBy = current?.actual_started_at
            ? Math.max(
                0,
                minutesBetween(current.scheduled_at, current.actual_started_at),
              )
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
                  <Avatar name={doctor.full_name} size="md" />
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
                    {doctor.full_name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {getDepartment(doctor.department_id!)?.name}
                  </p>
                </div>
              </div>
              <p className="mt-3 truncate text-sm text-slate-600">
                {current ? (
                  <>
                    With{" "}
                    <span className="font-medium text-slate-900">
                      {patientStore.get(current.patient_id)?.full_name}
                    </span>{" "}
                    ·{" "}
                    {formatDuration(
                      minutesBetween(current.actual_started_at!, now),
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

let simulatedBookingDone = false;

/**
 * Stands in for a Supabase Realtime INSERT: a patient books online a few
 * seconds after the page opens. Returns the ids to highlight as new.
 */
function useSimulatedRealtimeBooking(): Set<string> {
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (simulatedBookingDone) return;
    const timer = window.setTimeout(() => {
      simulatedBookingDone = true;
      const patientId = `pat-live-${crypto.randomUUID()}`;
      patientStore.add({
        id: patientId,
        full_name: "Femi Ojo",
        phone: "+2348051239876",
        email: null,
        created_at: demoNow().toISOString(),
      });
      const slotAt = atClinicTime(DEMO_TODAY, "15:40").toISOString();
      const id = `apt-live-${crypto.randomUUID()}`;
      appointmentStore.add({
        id,
        reference_code: newReferenceCode(),
        patient_id: patientId,
        physician_id: "stf-tunde",
        department_id: "dep-gm",
        original_scheduled_at: slotAt,
        scheduled_at: slotAt,
        checked_in_at: null,
        actual_started_at: null,
        actual_ended_at: null,
        status: "scheduled",
        cancellation_reason: null,
        reschedule_needs_review: false,
        reschedule_review_reason: null,
      });
      setFresh(new Set([id]));
      toast.info("New online booking", {
        description: "Femi Ojo · 15:40 with Dr. Tunde Bakare",
      });
      window.setTimeout(() => setFresh(new Set()), 8000);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, []);

  return fresh;
}
