import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CalendarCheck2, CalendarClock, Clock, Search, Stethoscope, UserRound, XCircle } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/appointment-status";
import { DateStrip, SlotGrid } from "@/components/booking/slot-picker";
import Button from "@/shared/button/button";
import { buttonStyles } from "@/shared/button/button-styles";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/shared/dialog/dialog";
import Field from "@/shared/form-field/form-field";
import Input from "@/shared/input/input";
import Textarea from "@/shared/textarea/textarea";
import Alert from "@/shared/alert/alert";
import { cn } from "@/lib/cn";
import { isValidPhone } from "@/lib/format";
import { bookableDates, formatDate, formatTimeRange } from "@/lib/time";
import {
  DEMO_LOOKUP,
  departmentSummaries,
  getAvailableSlots,
  getPublicAppointment,
  updateBooking,
} from "@/mocks/public-booking";

type Booking = NonNullable<ReturnType<typeof getPublicAppointment>>;

export const Route = createFileRoute("/_public/manage/")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } => ({
    ref: typeof search.ref === "string" ? search.ref : undefined,
  }),
  component: ManageBookingPage,
});

function ManageBookingPage() {
  const { ref } = Route.useSearch();
  const [booking, setBooking] = useState<Booking | null>(null);

  return (
    <div className="bg-linear-to-b from-brand-50 to-white">
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
        {booking ? (
          <BookingDetails booking={booking} onChange={setBooking} onBack={() => setBooking(null)} />
        ) : (
          <LookupForm initialReference={ref ?? ""} onFound={setBooking} />
        )}
      </div>
    </div>
  );
}

function LookupForm({ initialReference, onFound }: { initialReference: string; onFound: (booking: Booking) => void }) {
  const [reference, setReference] = useState(initialReference);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!reference.trim() || !isValidPhone(phone)) {
      setError("Enter your booking reference and the phone number you booked with.");
      return;
    }
    setSearching(true);
    setError(null);
    window.setTimeout(() => {
      setSearching(false);
      const found = getPublicAppointment(reference, phone);
      // Same message whether the code or the phone is wrong, so the form
      // never reveals which bookings exist.
      if (found) onFound(found);
      else setError("We couldn't find a booking with those details. Check both and try again.");
    }, 500);
  };

  return (
    <>
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-card">
          <Search className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">Manage your booking</h1>
        <p className="mt-2 text-slate-500">Look up your appointment to check the time, reschedule or cancel.</p>
      </div>

      <form noValidate onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
        <Field label="Booking reference" hint="It starts with CLN- and is on your confirmation.">
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
            <Input {...a11y} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 123 4567" />
          )}
        </Field>
        {error && <Alert tone="danger" icon={AlertTriangle} title={error} />}
        <Button type="submit" className="w-full" size="lg" loading={searching}>
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

function BookingDetails({ booking, onChange, onBack }: { booking: Booking; onChange: (b: Booking) => void; onBack: () => void }) {
  const isActive = booking.appointment_status === "scheduled";
  const rows = [
    { icon: Stethoscope, label: "Department", value: booking.department_name },
    { icon: UserRound, label: "Doctor", value: booking.physician_name },
    { icon: CalendarCheck2, label: "Date", value: formatDate(booking.appointment_time) },
    { icon: Clock, label: "Time", value: formatTimeRange(booking.appointment_time) },
  ];

  return (
    <>
      <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" aria-hidden />
        Look up another booking
      </button>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs text-slate-500">Booking for {booking.patient_name}</p>
            <p className="mt-0.5 font-mono text-lg font-semibold tracking-wide text-slate-900">{booking.booking_reference}</p>
          </div>
          <StatusBadge status={booking.appointment_status} />
        </div>

        <div className="space-y-5 px-6 py-5">
          {booking.time_under_review && (
            <Alert tone="warning" icon={CalendarClock} title="Your time may change">
              The clinic is reviewing today's schedule and will contact you if your appointment needs to move.
            </Alert>
          )}
          <dl className="grid gap-5 sm:grid-cols-2">
            {rows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden />
                <div>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="text-sm font-medium text-slate-900">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row">
          {isActive ? (
            <>
              <RescheduleDialog booking={booking} onDone={onChange} />
              <CancelDialog booking={booking} onDone={onChange} />
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

function RescheduleDialog({ booking, onDone }: { booking: Booking; onDone: (b: Booking) => void }) {
  const dates = useMemo(() => bookableDates(), []);
  const department = departmentSummaries.find((d) => d.name === booking.department_name)!;
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(dates[0]!);
  const [slotAt, setSlotAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const slots = useMemo(() => getAvailableSlots(department.id, date), [department.id, date]);

  const confirm = () => {
    if (!slotAt) return;
    setSaving(true);
    window.setTimeout(() => {
      const updated = updateBooking(booking.booking_reference, { appointment_time: slotAt, time_under_review: false })!;
      setSaving(false);
      setOpen(false);
      onDone(updated);
      toast.success("Appointment moved", { description: `${formatDate(slotAt)}, ${formatTimeRange(slotAt)}` });
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button className="sm:flex-1" onClick={() => setOpen(true)}>
        <CalendarClock aria-hidden />
        Reschedule
      </Button>
      <DialogContent size="lg" title="Choose a new time" description={`${booking.department_name} · a free doctor will be assigned`}>
        <div className="space-y-6">
          <DateStrip dates={dates} value={date} onChange={(d) => { setDate(d); setSlotAt(null); }} />
          <SlotGrid slots={slots} value={slotAt} onChange={setSlotAt} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep current time</Button>
          </DialogClose>
          <Button onClick={confirm} disabled={!slotAt} loading={saving}>
            Move appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({ booking, onDone }: { booking: Booking; onDone: (b: Booking) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const confirm = () => {
    setSaving(true);
    window.setTimeout(() => {
      const updated = updateBooking(booking.booking_reference, { appointment_status: "cancelled" })!;
      setSaving(false);
      setOpen(false);
      onDone(updated);
      toast("Appointment cancelled", { description: "The slot has been released for other patients." });
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="secondary" className="sm:flex-1" onClick={() => setOpen(true)}>
        <XCircle aria-hidden />
        Cancel appointment
      </Button>
      <DialogContent
        size="sm"
        title="Cancel this appointment?"
        description={`${formatDate(booking.appointment_time)}, ${formatTimeRange(booking.appointment_time)} with ${booking.physician_name}.`}
      >
        <Field label="Reason" optional hint="Helps the clinic plan its schedule.">
          {(a11y) => <Textarea {...a11y} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Feeling better" className="min-h-20" />}
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep appointment</Button>
          </DialogClose>
          <Button variant="danger" onClick={confirm} loading={saving}>
            Cancel appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
