import { cn } from "@/lib/cn";
import type { ISegmentedProp } from "./interface";

/** A compact single-choice control, announced as a radio group. */
export default function Segmented<T extends string | number>({ label, value, options, onChange, className }: ISegmentedProp<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("relative inline-flex max-w-full overflow-x-auto rounded-xl bg-slate-100 p-1 scrollbar-none", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
              selected ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "tabular rounded-full px-1.5 text-xs",
                  selected ? "bg-brand-50 text-brand-700" : "bg-slate-200/70 text-slate-500",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
