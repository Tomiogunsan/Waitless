import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  CalendarCheck2,
  CalendarPlus,
  Check,
  Clock,
  Copy,
  FileQuestion,
  IdCard,
  MapPin,
  Pill,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import Button from "@/shared/button/button";
import { buttonStyles } from "@/shared/button/button-styles";
import EmptyState from "@/shared/empty-state/empty-state";
import { cn } from "@/utils/cn";
import { formatPhone } from "@/utils/format";
import { APPOINTMENT_MINUTES, formatDate, formatTimeRange } from "@/utils/time";
import { getBooking } from "@/mocks/public-booking";

export const Route = createFileRoute("/_public/booking/$reference/")({
  loader: ({ params }) => {
    const booking = getBooking(params.reference);
    if (!booking) throw notFound();
    return booking;
  },
  component: ConfirmationPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-lg px-4 py-16">
      <EmptyState
        icon={FileQuestion}
        title="We couldn't find that booking"
        description="Check the reference code in your confirmation, or look the booking up with your phone number."
        action={
          <Link to="/manage" className={buttonStyles()}>
            Find my booking
          </Link>
        }
      />
    </div>
  ),
});

/** Builds a calendar file so patients can save the appointment. */
function downloadCalendarFile(
  reference: string,
  start: string,
  department: string,
) {
  const toIcs = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const from = new Date(start);
  const to = new Date(from.getTime() + APPOINTMENT_MINUTES * 60_000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Waitless//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${reference}@waitless`,
    `DTSTAMP:${toIcs(new Date())}`,
    `DTSTART:${toIcs(from)}`,
    `DTEND:${toIcs(to)}`,
    `SUMMARY:${department} appointment (Waitless)`,
    `DESCRIPTION:Booking reference ${reference}. Please arrive 10 minutes early.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const link = Object.assign(document.createElement("a"), {
    href: url,
    download: `waitless-${reference}.ics`,
  });
  link.click();
  URL.revokeObjectURL(url);
}

function ConfirmationPage() {
  const booking = Route.useLoaderData();
  const [copied, setCopied] = useState(false);

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(booking.booking_reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the code is still visible to copy by hand.
    }
  };

  const details = [
    { icon: Stethoscope, label: "Department", value: booking.department_name },
    { icon: UserRound, label: "Doctor", value: booking.physician_name },
    {
      icon: CalendarCheck2,
      label: "Date",
      value: formatDate(booking.appointment_time),
    },
    {
      icon: Clock,
      label: "Time",
      value: formatTimeRange(booking.appointment_time),
    },
    {
      icon: IdCard,
      label: "Booked for",
      value: `${booking.patient_name} · ${formatPhone(booking.phone)}`,
    },
    {
      icon: MapPin,
      label: "Where",
      value: "Waitless Clinic, 14 Admiralty Way, Lekki, Lagos",
    },
  ];

  return (
    <div className="bg-linear-to-b from-brand-50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center">
          <span className="relative mx-auto flex size-16 items-center justify-center">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400/40" />
            <span className="relative flex size-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
              <Check className="size-8" strokeWidth={3} aria-hidden />
            </span>
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">
            You're booked in
          </h1>
          <p className="mt-2 text-slate-500">
            Keep your reference code. You'll need it with your phone number to
            make changes.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
          <div className="flex flex-col items-center gap-3 border-b border-dashed border-slate-200 bg-brand-600 px-6 py-6 text-white sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="text-xs font-medium tracking-wide text-brand-100 uppercase">
                Booking reference
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-wider">
                {booking.booking_reference}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={copyReference}
              aria-live="polite"
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Copied" : "Copy code"}
            </Button>
          </div>

          <dl className="grid gap-x-6 gap-y-5 p-6 sm:grid-cols-2">
            {details.map(({ icon: Icon, label, value }) => (
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

          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row">
            <Button
              variant="primary"
              className="sm:flex-1"
              onClick={() =>
                downloadCalendarFile(
                  booking.booking_reference,
                  booking.appointment_time,
                  booking.department_name,
                )
              }
            >
              <CalendarPlus aria-hidden />
              Add to calendar
            </Button>
            <Link
              to="/manage"
              search={{ ref: booking.booking_reference }}
              className={cn(
                buttonStyles({ variant: "secondary" }),
                "sm:flex-1",
              )}
            >
              Reschedule or cancel
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Pill className="size-4 text-brand-600" aria-hidden />
            Before your visit
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {[
              "Arrive 10 minutes early and check in at the front desk.",
              "Bring any medication you're currently taking, or a list of it.",
              "If your doctor is running late, your time may move slightly. Check here for the latest time.",
            ].map((tip) => (
              <li key={tip} className="flex gap-2">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-emerald-500"
                  aria-hidden
                />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
