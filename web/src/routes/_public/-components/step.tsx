import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export function Step({
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
