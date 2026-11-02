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
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/shared/badge/appointment-status-badge";
import {
  CancelAppointmentDialog,
  NewAppointmentDialog,
  ReassignDialog,
  RescheduleDialog,
} from "@/routes/_modules/front-desk/-components/dialogs";
import Avatar from "@/shared/avatar/avatar";
import Button from "@/shared/button/button";
import Select from "@/shared/select/select";
import Badge from "@/shared/badge/badge";
import Alert from "@/shared/alert/alert";
import LiveIndicator from "@/shared/live-indicator/live-indicator";
import PageHeader from "@/shared/page-header/page-header";
import Segmented from "@/shared/segmented/segmented";
import StatTile from "@/shared/stat-tile/stat-tile";
import { cn } from "@/utils/cn";
import { formatPhone, phoneMatches } from "@/utils/format";
import { requireRole } from "@/utils/guards";
import {
  clinicToday,
  formatDate,
  formatDuration,
  formatTime,
  minutesBetween,
} from "@/utils/time";
import {
  useCheckIn,
  useDayAppointments,
  useMarkNoShow,
  usePhysicians,
} from "@/hooks/use-appointments";
import { useNow } from "@/hooks/use-now";
import type { ITableHead, ITableMenuOption } from "@/shared/table/interface";
import Table from "@/shared/table/table";
import TableEmptyState from "@/shared/table/table-empty-state";
import type { StaffAppointment } from "@/types/appointment";
import type { AppointmentStatus } from "@/types/clinic";
import {
  FILTER_STATUSES,
  isDone,
  type DialogState,
  type Filter,
} from "./-constants";

export const Route = createFileRoute("/_modules/front-desk/")({
  beforeLoad: ({ context }) =>
    requireRole(context.session, ["front_desk", "admin"]),
  component: FrontDeskPage,
});

function FrontDeskPage() {
  const now = useNow();
  const date = useMemo(() => clinicToday(), []);
  const { data: today = [], isPending, isError } = useDayAppointments(date);
  const { data: physicians = [] } = usePhysicians();
  const {
    mutate: checkIn,
    isPending: checkingIn,
    variables: checkingId,
  } = useCheckIn();
  const { mutate: markNoShow } = useMarkNoShow();

  const [filter, setFilter] = useState<Filter>("all");
  const [doctor, setDoctor] = useState("all");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [newOpen, setNewOpen] = useState(false);
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
      if (doctor !== "all" && a.physician.id !== doctor) return false;
      if (!q) return true;
      return (
        a.patient.fullName.toLowerCase().includes(q) ||
        phoneMatches(a.patient.phone, q) ||
        a.reference.toLowerCase().includes(q)
      );
    });
  }, [today, filter, doctor, query]);

  // The database has no undo for these, so the toasts don't offer one.
  const handleCheckIn = (a: StaffAppointment) =>
    checkIn(a.id, {
      onSuccess: () =>
        toast.success(`${a.patient.fullName} checked in`, {
          description: `Added to ${a.physician.fullName}'s queue`,
        }),
      onError: (err) => toast.error(err.message),
    });

  const handleNoShow = (a: StaffAppointment) =>
    markNoShow(a.id, {
      onSuccess: () => toast(`${a.patient.fullName} marked as a no-show`),
      onError: (err) => toast.error(err.message),
    });

  const isOpen = (a: StaffAppointment) =>
    a.status === "scheduled" || a.status === "checked_in";

  const menuOptions: ITableMenuOption<StaffAppointment>[] = [
    {
      menuTitle: "Check in",
      icon: UserCheck,
      action: handleCheckIn,
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
      action: handleNoShow,
      hide: (a) => a.status !== "scheduled",
      disabled: (a) => minutesBetween(a.scheduledAt, now) < 15,
      disabledReason: "after +15 min",
    },
    {
      menuTitle: "View patient",
      icon: UserRound,
      action: (a) =>
        void navigate({
          to: "/patients/$patientId",
          params: { patientId: a.patient.id },
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

  const columns: ITableHead<StaffAppointment>[] = [
    {
      label: "Time",
      accessor: "scheduledAt",
      render: (a) => (
        <div>
          <span
            className={cn(
              "tabular font-semibold",
              isDone(a) ? "text-slate-400" : "text-slate-900",
            )}
          >
            {formatTime(a.scheduledAt)}
          </span>
          {a.originalScheduledAt !== a.scheduledAt && (
            <span
              className="tabular block text-xs text-slate-400 line-through"
              title="Originally booked time"
            >
              {formatTime(a.originalScheduledAt)}
            </span>
          )}
        </div>
      ),
    },
    {
      label: "Patient",
      accessor: null,
      render: (a) => {
        const { patient } = a;
        return (
          <div className="flex min-w-56 items-center gap-3">
            <Avatar
              name={patient.fullName}
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
                {patient.fullName}
              </Link>
              <span className="tabular block truncate text-xs text-slate-500">
                {formatPhone(patient.phone)} ·{" "}
                <span className="font-mono">{a.reference}</span>
              </span>
            </div>
          </div>
        );
      },
    },
    {
      label: "Doctor",
      accessor: null,
      render: (a) => (
        <div className="whitespace-nowrap">
          <span
            className={cn(
              "block font-medium",
              isDone(a) ? "text-slate-500" : "text-slate-700",
            )}
          >
            {a.physician.fullName}
          </span>
          <span className="block text-xs text-slate-500">
            {a.department.name}
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
          {a.needsReview && a.status === "scheduled" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap text-amber-700">
              <AlertTriangle className="size-3" aria-hidden /> Needs review
            </span>
          )}
        </div>
      ),
    },
    {
      label: "Waiting",
      accessor: "checkedInAt",
      render: (a) => <WaitCell appointment={a} now={now} />,
    },
    {
      label: "Arrival",
      accessor: null,
      align: "right",
      render: (a) =>
        a.status === "scheduled" ? (
          <Button
            size="sm"
            variant="soft"
            loading={checkingIn && checkingId === a.id}
            onClick={() => handleCheckIn(a)}
          >
            <UserCheck aria-hidden />
            Check in
          </Button>
        ) : null,
    },
  ];

  const needsReview = today.filter(
    (a) => a.needsReview && a.status === "scheduled",
  );
  const avgWait = (() => {
    const waiting = today.filter(
      (a) => a.status === "checked_in" && a.checkedInAt,
    );
    if (!waiting.length) return 0;
    return (
      waiting.reduce(
        (sum, a) => sum + minutesBetween(a.checkedInAt!, now),
        0,
      ) / waiting.length
    );
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<LiveIndicator label={`Live · ${formatTime(now)}`} />}
        title="Today"
        description={formatDate(date)}
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
                `${a.patient.fullName} (${formatTime(a.scheduledAt)}, ${a.physician.fullName})`,
            )
            .join(" · ")}
          . Reschedule or reassign them so the patients aren't kept waiting.
        </Alert>
      )}

      {isError && (
        <Alert
          tone="danger"
          icon={AlertTriangle}
          title="We couldn't load today's appointments. Refresh to try again."
        />
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

        <Table<StaffAppointment>
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
              {physicians.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </Select>
          }
          showMenu
          menuOptions={menuOptions}
          rowLabel={(a) => a.patient.fullName}
          loading={isPending}
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
  appointment: StaffAppointment;
  now: Date;
}) {
  if (a.status === "checked_in" && a.checkedInAt) {
    const minutes = minutesBetween(a.checkedInAt, now);
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
  if (a.status === "in_progress" && a.startedAt) {
    return (
      <span className="text-violet-700">
        In for {formatDuration(minutesBetween(a.startedAt, now))}
      </span>
    );
  }
  if (a.status === "completed" && a.checkedInAt && a.startedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-400">
        <CheckCircle2 className="size-3.5" aria-hidden />
        Waited{" "}
        {formatDuration(minutesBetween(a.checkedInAt, a.startedAt))}
      </span>
    );
  }
  return <span className="text-slate-300">—</span>;
}

/** Each doctor at a glance: who they're with, who's waiting, how late they're running. */
function DoctorBoard({
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
