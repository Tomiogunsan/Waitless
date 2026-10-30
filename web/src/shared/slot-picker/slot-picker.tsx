import { ChevronLeft, ChevronRight, Coffee, Moon, Sun } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/utils/cn";
import { CLINIC_TZ, formatTime } from "@/utils/time";
import type { IDateStripProp, ISlotGridProp, ISlotGroupProp } from "./interface";

const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const dayOfMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });
const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

/** Horizontally scrolling list of bookable clinic days. */
export function DateStrip({ dates, value, onChange }: IDateStripProp) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (direction: 1 | -1) =>
    scroller.current?.scrollBy({ left: direction * scroller.current.clientWidth * 0.8, behavior: "smooth" });

  const arrow =
    "hidden size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-slate-900 sm:flex";

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => scrollBy(-1)} className={arrow} aria-label="Earlier dates">
        <ChevronLeft className="size-4" />
      </button>
      <div
        ref={scroller}
        role="radiogroup"
        aria-label="Appointment date"
        className="relative flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto scroll-smooth pb-1 scrollbar-none"
      >
        {dates.map((date) => {
          const d = new Date(`${date}T12:00:00Z`);
          const selected = date === value;
          return (
            <button
              key={date}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: CLINIC_TZ }).format(d)}
              onClick={() => onChange(date)}
              className={cn(
                "flex w-16 shrink-0 snap-start flex-col items-center rounded-xl border py-2.5 transition-all",
                selected
                  ? "border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/25"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/50",
              )}
            >
              <span className={cn("text-xs font-medium", selected ? "text-brand-100" : "text-slate-500")}>
                {weekday.format(d)}
              </span>
              <span className="mt-0.5 text-lg leading-tight font-semibold">{dayOfMonth.format(d)}</span>
              <span className={cn("text-[11px]", selected ? "text-brand-100" : "text-slate-400")}>{month.format(d)}</span>
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => scrollBy(1)} className={arrow} aria-label="Later dates">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

/** Morning and afternoon slots; taken ones are visibly disabled. */
export function SlotGrid({ slots, value, onChange }: ISlotGridProp) {
  const morning = slots.filter((s) => formatTime(s.slotAt) < "12:00");
  const afternoon = slots.filter((s) => formatTime(s.slotAt) >= "13:00");
  const available = slots.filter((s) => s.isAvailable).length;

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        <span className="font-medium text-slate-900">{available}</span> of {slots.length} slots available
      </p>
      <SlotGroup icon={Sun} label="Morning" slots={morning} value={value} onChange={onChange} />
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-100" />
        <Coffee className="size-3.5" aria-hidden />
        Lunch break 12:00 – 13:00
        <span className="h-px flex-1 bg-slate-100" />
      </div>
      <SlotGroup icon={Moon} label="Afternoon" slots={afternoon} value={value} onChange={onChange} />
    </div>
  );
}

/**
 * Placeholder in the exact layout of SlotGrid (5 morning, lunch, 6 afternoon)
 * so the page doesn't jump when the real slots arrive.
 */
export function SlotGridSkeleton() {
  const group = (count: number) => (
    <div>
      <div className="mb-2.5 h-3 w-20 animate-pulse rounded bg-slate-100" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    </div>
  );

  return (
    <div role="status" aria-label="Loading available times" className="space-y-5">
      <div className="h-4 w-40 animate-pulse rounded bg-slate-100" aria-hidden />
      <div aria-hidden className="space-y-5">
        {group(5)}
        <div className="h-px bg-slate-100" />
        {group(6)}
      </div>
    </div>
  );
}

function SlotGroup({
  icon: Icon,
  label,
  slots,
  value,
  onChange,
}: ISlotGroupProp) {
  return (
    <fieldset>
      <legend className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {slots.map((slot) => {
          const selected = slot.slotAt === value;
          return (
            <button
              key={slot.slotAt}
              type="button"
              disabled={!slot.isAvailable}
              aria-pressed={selected}
              onClick={() => onChange(slot.slotAt)}
              className={cn(
                "tabular h-11 rounded-lg border text-sm font-medium transition-all",
                selected && "border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/25",
                !selected && slot.isAvailable && "border-slate-200 bg-white text-slate-800 hover:border-brand-400 hover:text-brand-700",
                !slot.isAvailable &&
                  "cursor-not-allowed border-dashed border-slate-200 bg-slate-50 text-slate-300 line-through decoration-slate-300",
              )}
            >
              {formatTime(slot.slotAt)}
              {!slot.isAvailable && <span className="sr-only"> (unavailable)</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
