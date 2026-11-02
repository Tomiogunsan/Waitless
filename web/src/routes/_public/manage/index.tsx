import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck2,
  CalendarClock,
  Clock,
  Search,
  Stethoscope,
  UserRound,
  XCircle,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/shared/badge/appointment-status-badge";
import { DateStrip, SlotGrid, SlotGridSkeleton } from "@/shared/slot-picker/slot-picker";
import Button from "@/shared/button/button";
import { buttonStyles } from "@/shared/button/button-styles";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/shared/dialog/dialog";
import Field from "@/shared/form-field/form-field";
import Input from "@/shared/input/input";
import Textarea from "@/shared/textarea/textarea";
import Alert from "@/shared/alert/alert";
import { cn } from "@/utils/cn";
import { isValidPhone } from "@/utils/format";
import { bookableDates, formatDate, formatTimeRange } from "@/utils/time";
import { DEMO_LOOKUP } from "@/constants/demo-accounts";
import {
  useAvailableSlots,
  useCancelAppointment,
  useDepartments,
  useFindAppointment,
  useRescheduleAppointment,
} from "@/hooks/use-booking";
import type { FoundBooking } from "@/types/booking";

export const Route = createFileRoute("/_public/manage/")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } => ({
    ref: typeof search.ref === "string" ? search.ref : undefined,
  }),
  component: ManageBookingPage,
});

function ManageBookingPage() {
  const { ref } = Route.useSearch();
  const [found, setFound] = useState<FoundBooking | null>(null);

  return (
    <div className="bg-linear-to-b from-brand-50 to-white">
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
        {found ? (
          <BookingDetails
            found={found}
            onChange={setFound}
            onBack={() => setFound(null)}
          />
        ) : (
          <LookupForm initialReference={ref ?? ""} onFound={setFound} />
        )}
      </div>
    </div>
  );
}

function LookupForm({
  initialReference,
  onFound,
}: {
  initialReference: string;
  onFound: (found: FoundBooking) => void;
}) {
  const [reference, setReference] = useState(initialReference);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { mutate: find, isPending } = useFindAppointment();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!reference.trim() || !isValidPhone(phone)) {
      setError(
        "Enter your booking reference and the phone number you booked with.",
      );
      return;
    }
    setError(null);
    find(
      { reference: reference.trim().toUpperCase(), phone },
      {
        onSuccess: (appointment) => {
         
          if (appointment) onFound({ appointment, phone });
          else
            setError(
              "We couldn't find a booking with those details. Check both and try again.",
            );
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <>
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-card">
          <Search className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">
          Manage your booking
        </h1>
        <p className="mt-2 text-slate-500">
          Look up your appointment to check the time, reschedule or cancel.
        </p>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card"
      >
        <Field
          label="Booking reference"
          hint="It starts with CLN- and is on your confirmation."
        >
          {(a11y) => (
            <Input
              {...a11y}
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase())}
              placeholder="CLN-XXXXXXXXXXXX"
              className="font-mono tracking-wide uppercase"
              autoComplete="off"
            />
          )}
        </Field>
        <Field label="Phone number">
          {(a11y) => (
            <Input
              {...a11y}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0803 123 4567"
            />
          )}
        </Field>
        {error && <Alert tone="danger" icon={AlertTriangle} title={error} />}
        <Button type="submit" className="w-full" size="lg" loading={isPending}>
          Find booking
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Just looking around?{" "}
        <button
          type="button"
          className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
          onClick={() => {
            setReference(DEMO_LOOKUP.reference);
            setPhone(DEMO_LOOKUP.phone);
          }}
        >
          Fill in the demo booking
        </button>
      </p>
    </>
  );
}

function BookingDetails({
  found,
  onChange,
  onBack,
}: {
  found: FoundBooking;
  onChange: (found: FoundBooking) => void;
  onBack: () => void;
}) {
  const { appointment } = found;
  const isActive = appointment.status === "scheduled";
  const rows = [
    { icon: Stethoscope, label: "Department", value: appointment.departmentName },
    { icon: UserRound, label: "Doctor", value: appointment.physicianName },
    {
      icon: CalendarCheck2,
      label: "Date",
      value: formatDate(appointment.appointmentTime),
    },
    {
      icon: Clock,
      label: "Time",
      value: formatTimeRange(appointment.appointmentTime),
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Look up another booking
      </button>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs text-slate-500">Your booking</p>
            <p className="mt-0.5 font-mono text-lg font-semibold tracking-wide text-slate-900">
              {appointment.reference}
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        <div className="space-y-5 px-6 py-5">
          {appointment.timeUnderReview && (
            <Alert
              tone="warning"
              icon={CalendarClock}
              title="Your time may change"
            >
              The clinic is reviewing today's schedule and will contact you if
              your appointment needs to move.
            </Alert>
          )}
          <dl className="grid gap-5 sm:grid-cols-2">
            {rows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex gap-3">
                <Icon
                  className="mt-0.5 size-5 shrink-0 text-brand-500"
                  aria-hidden
                />
                <div>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="text-sm font-medium text-slate-900">
                    {value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row">
          {isActive ? (
            <>
              <RescheduleDialog found={found} onDone={onChange} />
              <CancelDialog found={found} onDone={onChange} />
            </>
          ) : (
            <Link to="/" className={cn(buttonStyles(), "w-full")}>
              Book a new appointment
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

function RescheduleDialog({
  found,
  onDone,
}: {
  found: FoundBooking;
  onDone: (found: FoundBooking) => void;
}) {
  const { appointment, phone } = found;
  const dates = useMemo(() => bookableDates(), []);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(dates[0]!);
  const [slotAt, setSlotAt] = useState<string | null>(null);
  // The lookup only returns the department's name; slots need its id.
  const { data: departments = [] } = useDepartments();
  const department = departments.find(
    (d) => d.name === appointment.departmentName,
  );
  const { data: slots = [], isPending: loadingSlots } = useAvailableSlots(
    open ? department?.id : undefined,
    date,
  );
  const { mutate: reschedule, isPending, error } = useRescheduleAppointment();

  const confirm = () => {
    if (!slotAt) return;
    reschedule(
      { reference: appointment.reference, phone, newSlotAt: slotAt },
      {
        onSuccess: (updated) => {
          if (!updated) return;
          setOpen(false);
          onDone({ appointment: updated, phone });
          toast.success("Appointment moved", {
            description: `${formatDate(slotAt)}, ${formatTimeRange(slotAt)}`,
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button className="sm:flex-1" onClick={() => setOpen(true)}>
        <CalendarClock aria-hidden />
        Reschedule
      </Button>
      <DialogContent
        size="lg"
        title="Choose a new time"
        description={`${appointment.departmentName} · a free doctor will be assigned`}
      >
        <div className="space-y-6">
          <DateStrip
            dates={dates}
            value={date}
            onChange={(d) => {
              setDate(d);
              setSlotAt(null);
            }}
          />
          {loadingSlots ? (
            <SlotGridSkeleton />
          ) : (
            <SlotGrid slots={slots} value={slotAt} onChange={setSlotAt} />
          )}
          {error && (
            <Alert
              tone="danger"
              icon={AlertTriangle}
              title={error.message}
            />
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep current time</Button>
          </DialogClose>
          <Button onClick={confirm} disabled={!slotAt} loading={isPending}>
            Move appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  found,
  onDone,
}: {
  found: FoundBooking;
  onDone: (found: FoundBooking) => void;
}) {
  const { appointment, phone } = found;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { mutate: cancel, isPending, error } = useCancelAppointment();

  const confirm = () => {
    cancel(
      { reference: appointment.reference, phone, reason: reason.trim() },
      {
        onSuccess: (updated) => {
          if (!updated) return;
          setOpen(false);
          onDone({ appointment: updated, phone });
          toast("Appointment cancelled", {
            description: "The slot has been released for other patients.",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="secondary"
        className="sm:flex-1"
        onClick={() => setOpen(true)}
      >
        <XCircle aria-hidden />
        Cancel appointment
      </Button>
      <DialogContent
        size="sm"
        title="Cancel this appointment?"
        description={`${formatDate(appointment.appointmentTime)}, ${formatTimeRange(appointment.appointmentTime)} with ${appointment.physicianName}.`}
      >
        <Field
          label="Reason"
          optional
          hint="Helps the clinic plan its schedule."
        >
          {(a11y) => (
            <Textarea
              {...a11y}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Feeling better"
              className="min-h-20"
            />
          )}
        </Field>
        {error && (
          <Alert
            tone="danger"
            icon={AlertTriangle}
            title={error.message}
          />
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep appointment</Button>
          </DialogClose>
          <Button variant="danger" onClick={confirm} loading={isPending}>
            Cancel appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
