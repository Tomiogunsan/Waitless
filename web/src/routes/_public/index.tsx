import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check } from "lucide-react";
import { useMemo, useState } from "react";
import Alert from "@/shared/alert/alert";
import { DateStrip, SlotGrid, SlotGridSkeleton } from "@/shared/slot-picker/slot-picker";
import { cn } from "@/utils/cn";
import { bookableDates, formatDate, isIsoDate } from "@/utils/time";
import { useAvailableSlots, useBookAppointment, useDepartments } from "@/hooks/use-booking";
import { DEFAULT_DEPARTMENT, DEPARTMENT_DETAILS } from "./-constants/department";
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
    date: isIsoDate(search.date) ? search.date : undefined,
  }),
  component: BookingPage,
});


function BookingPage() {
  const { department, date } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const dates = useMemo(() => bookableDates(), []);
  const {
    data: departments = [],
    isPending: loadingDepartments,
    isError: departmentsFailed,
  } = useDepartments();
    const selectedDepartment = departments.find((d) => d.id === department);
  const selectedDate = date && dates.includes(date) ? date : null;

  const { data: slots = [], isPending: loadingSlots } = useAvailableSlots(
    selectedDepartment?.id,
    selectedDate,
  );

  const { mutate: book, isPending, error } = useBookAppointment();
  const [slotAt, setSlotAt] = useState<string | null>(null);
  const slotIsValid =
    slotAt !== null &&
    slots.some((s) => s.slotAt === slotAt && s.isAvailable);

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
            {departmentsFailed && (
              <Alert
                tone="danger"
                icon={AlertTriangle}
                title="We couldn't load departments. Please refresh the page."
              />
            )}
            <div
              className="grid gap-3 sm:grid-cols-2"
              role="radiogroup"
              aria-label="Department"
              aria-busy={loadingDepartments || undefined}
            >
              {loadingDepartments &&
                Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" aria-hidden />
                ))}
              {departments.map((d) => {
                const { icon: Icon, description } = DEPARTMENT_DETAILS[d.name] ?? DEFAULT_DEPARTMENT;
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
                        {description}
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
                    {loadingSlots ? (
                      <SlotGridSkeleton />
                    ) : (
                      <SlotGrid slots={slots} value={slotAt} onChange={setSlotAt} />
                    )}
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
                saving={isPending}
                error={error?.message}
                onSubmit={(details) =>
                  book(
                    { departmentId: selectedDepartment.id, slotAt: slotAt!, ...details },
                    {
                      onSuccess: (appointment) => {
                        if (!appointment) return;
                        void navigate({
                          to: "/booking/$reference",
                          params: { reference: appointment.reference },
                          search: {},
                        });
                      },
                    },
                  )
                }
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
