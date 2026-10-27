import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Baby, Check, HeartPulse, Sparkles, Stethoscope, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { DateStrip, SlotGrid } from "@/shared/slot-picker/slot-picker";
import { cn } from "@/utils/cn";
import { bookableDates, formatDate } from "@/utils/time";
import {
  bookPublicAppointment,
  departmentSummaries,
  getAvailableSlots,
} from "@/mocks/public-booking";
import { DetailsForm } from "./-components/details-form";
import { Hero } from "./-components/hero";
import { Step } from "./-components/step";
import { Summary } from "./-components/summary";

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










