import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Baby,
  CalendarCheck2,
  Check,
  Clock,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { DateStrip, SlotGrid } from "@/shared/slot-picker/slot-picker";
import Button from "@/shared/button/button";
import Field from "@/shared/form-field/form-field";
import Input from "@/shared/input/input";
import { cn } from "@/utils/cn";
import { isValidEmail, isValidPhone, normalizePhone } from "@/utils/format";
import { bookableDates, formatDate, formatTimeRange } from "@/utils/time";
import {
  bookPublicAppointment,
  departmentSummaries,
  getAvailableSlots,
} from "@/mocks/public-booking";

// Department and date live in the URL, so a half-finished booking can be
// shared or survive a refresh. TanStack Router validates and types them.
interface BookingSearch {
  department?: string;
  date?: string;
}

export const Route = createFileRoute("/_public/")({
  validateSearch: (search: Record<string, unknown>): BookingSearch => ({
    department:
      typeof search.department === "string" ? search.department : undefined,
    date:
      typeof search.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
        ? search.date
        : undefined,
  }),
  component: BookingPage,
});

const DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  "dep-gm": Stethoscope,
  "dep-paed": Baby,
  "dep-og": HeartPulse,
  "dep-derm": Sparkles,
};

function BookingPage() {
  const { department, date } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const dates = useMemo(() => bookableDates(), []);
  const selectedDepartment = departmentSummaries.find(
    (d) => d.id === department,
  );
  const selectedDate = date && dates.includes(date) ? date : null;
  const slots = useMemo(
    () =>
      selectedDepartment && selectedDate
        ? getAvailableSlots(selectedDepartment.id, selectedDate)
        : [],
    [selectedDepartment, selectedDate],
  );

  const [slotAt, setSlotAt] = useState<string | null>(null);
  const slotIsValid =
    slotAt !== null &&
    slots.some((s) => s.slot_at === slotAt && s.is_available);

  const setSearch = (next: BookingSearch) => {
    setSlotAt(null);
    void navigate({
      search: (prev) => ({ ...prev, ...next }),
      replace: true,
      resetScroll: false,
    });
  };

  return (
    <>
      <Hero />

      <div className="relative z-10 mx-auto -mt-16 grid max-w-6xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Step
            number={1}
            title="Choose a department"
            done={Boolean(selectedDepartment)}
          >
            <div
              className="grid gap-3 sm:grid-cols-2"
              role="radiogroup"
              aria-label="Department"
            >
              {departmentSummaries.map((d) => {
                const Icon = DEPARTMENT_ICONS[d.id] ?? Stethoscope;
                const selected = d.id === selectedDepartment?.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() =>
                      setSearch({
                        department: d.id,
                        date: selectedDate ?? dates[0],
                      })
                    }
                    className={cn(
                      "group flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      selected
                        ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20"
                        : "border-slate-200 hover:border-brand-300 hover:bg-slate-50/50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                        selected
                          ? "bg-brand-600 text-white"
                          : "bg-brand-50 text-brand-600 group-hover:bg-brand-100",
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 font-medium text-slate-900">
                        {d.name}
                        {selected && (
                          <Check
                            className="size-4 text-brand-600"
                            aria-hidden
                          />
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-slate-500">
                        {d.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Step>

          <Step
            number={2}
            title="Pick a date and time"
            done={slotIsValid}
            disabled={!selectedDepartment}
          >
            {selectedDepartment && (
              <div className="space-y-6">
                <DateStrip
                  dates={dates}
                  value={selectedDate}
                  onChange={(d) => setSearch({ date: d })}
                />
                {selectedDate && (
                  <div>
                    <h3 className="mb-3 text-sm font-medium text-slate-900">
                      {formatDate(selectedDate)}
                    </h3>
                    <SlotGrid
                      slots={slots}
                      value={slotAt}
                      onChange={setSlotAt}
                    />
                  </div>
                )}
              </div>
            )}
          </Step>

          <Step
            number={3}
            title="Your details"
            done={false}
            disabled={!slotIsValid}
          >
            {slotIsValid && selectedDepartment && (
              <DetailsForm
                onSubmit={(details) => {
                  const booking = bookPublicAppointment({
                    departmentId: selectedDepartment.id,
                    slotAt: slotAt!,
                    ...details,
                  });
                  void navigate({
                    to: "/booking/$reference",
                    params: { reference: booking.booking_reference },
                    search: {},
                  });
                }}
              />
            )}
          </Step>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Summary
            departmentName={selectedDepartment?.name}
            slotAt={slotIsValid ? slotAt : null}
          />
        </aside>
      </div>
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-600 pb-28 text-white">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(60rem_30rem_at_80%_-10%,var(--color-brand-400),transparent),radial-gradient(40rem_20rem_at_0%_120%,var(--color-brand-800),transparent)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] bg-size-[32px_32px]"
      />
      <div className="relative mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20 backdrop-blur">
          <Activity className="size-3.5" aria-hidden />
          Average wait this week: 14 minutes
        </p>
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          See a doctor, not a waiting room.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-brand-100">
          Book a 40-minute appointment in under a minute. No account, no phone
          calls, and your place in the queue is kept for you.
        </p>
        <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-50">
          {[
            "No account needed",
            "Free to cancel or reschedule",
            "Doctors assigned automatically",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-white/15">
                <Check className="size-3" aria-hidden />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Step({
  number,
  title,
  done,
  disabled = false,
  children,
}: {
  number: number;
  title: string;
  done: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`step-${number}`}
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-opacity sm:p-6",
        disabled && "opacity-60",
      )}
    >
      <h2
        id={`step-${number}`}
        className="flex items-center gap-3 text-base font-semibold text-slate-900"
      >
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full text-sm font-semibold transition-colors",
            done
              ? "bg-emerald-500 text-white"
              : disabled
                ? "bg-slate-100 text-slate-400"
                : "bg-brand-600 text-white",
          )}
        >
          {done ? <Check className="size-4" aria-label="Done" /> : number}
        </span>
        {title}
      </h2>
      {!disabled && <div className="mt-5">{children}</div>}
    </section>
  );
}

interface Details {
  fullName: string;
  phone: string;
  email: string;
}

function DetailsForm({ onSubmit }: { onSubmit: (details: Details) => void }) {
  const [values, setValues] = useState<Details>({
    fullName: "",
    phone: "",
    email: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors = {
    fullName: values.fullName.trim() ? undefined : "Enter your full name",
    phone: isValidPhone(values.phone)
      ? undefined
      : "Enter a valid phone number, e.g. 0803 123 4567",
    email:
      !values.email || isValidEmail(values.email)
        ? undefined
        : "Enter a valid email address",
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key: keyof Details) => (submitted ? errors[key] : undefined);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    setSaving(true);
    // Simulates the network round trip to book_public_appointment.
    window.setTimeout(() => onSubmit(values), 700);
  };

  const update =
    (key: keyof Details) => (event: { target: { value: string } }) =>
      setValues((v) => ({ ...v, [key]: event.target.value }));

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      <Field label="Full name" error={show("fullName")}>
        {(a11y) => (
          <Input
            {...a11y}
            autoComplete="name"
            value={values.fullName}
            onChange={update("fullName")}
            placeholder="e.g. Amaka Obi"
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Phone number"
          error={show("phone")}
          hint={
            isValidPhone(values.phone)
              ? `We'll use ${normalizePhone(values.phone)} to find your booking`
              : "Returning patient? Use the same number as before."
          }
        >
          {(a11y) => (
            <Input
              {...a11y}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={update("phone")}
              placeholder="0803 123 4567"
            />
          )}
        </Field>
        <Field label="Email" optional error={show("email")}>
          {(a11y) => (
            <Input
              {...a11y}
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={update("email")}
              placeholder="you@example.com"
            />
          )}
        </Field>
      </div>
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="size-4 shrink-0 text-brand-600" aria-hidden />
          Only clinic staff can see your details.
        </p>
        <Button type="submit" size="lg" loading={saving}>
          Confirm booking
          {!saving && <ArrowRight aria-hidden />}
        </Button>
      </div>
    </form>
  );
}

function Summary({
  departmentName,
  slotAt,
}: {
  departmentName?: string;
  slotAt: string | null;
}) {
  const rows: { icon: LucideIcon; label: string; value: string | null }[] = [
    { icon: Stethoscope, label: "Department", value: departmentName ?? null },
    {
      icon: CalendarCheck2,
      label: "Date",
      value: slotAt ? formatDate(slotAt) : null,
    },
    {
      icon: Clock,
      label: "Time",
      value: slotAt ? formatTimeRange(slotAt) : null,
    },
    {
      icon: UserRound,
      label: "Doctor",
      value: departmentName ? "First available, assigned for you" : null,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <h2 className="text-sm font-semibold text-slate-900">Your appointment</h2>
      <dl className="mt-4 space-y-4">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd
                className={cn(
                  "text-sm font-medium",
                  value ? "text-slate-900" : "text-slate-300",
                )}
              >
                {value ?? "Not selected"}
              </dd>
            </div>
          </div>
        ))}
      </dl>
      <div className="mt-5 rounded-xl bg-brand-50 p-3.5 text-xs leading-relaxed text-brand-900">
        Arrive 10 minutes early and check in at the front desk. If your doctor
        is running late, later appointments are moved automatically so you never
        wait long.
      </div>
    </div>
  );
}
