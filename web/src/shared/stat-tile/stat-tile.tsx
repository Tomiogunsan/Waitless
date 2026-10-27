import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/utils/cn";
import type { IStatTileProp } from "./interface";

export default function StatTile({ label, value, icon: Icon, delta, hint, className }: IStatTileProp) {
  const up = delta ? delta.value >= 0 : false;
  const good = delta ? (delta.upIsGood ?? true) === up : false;
  const DeltaIcon = up ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={cn("rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {delta && (
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 font-semibold",
              good ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
            )}
          >
            <DeltaIcon className="size-3.5" aria-hidden />
            {delta.format ? delta.format(delta.value) : `${up ? "+" : ""}${delta.value}`}
          </span>
          {delta.label}
        </p>
      )}
      {hint && !delta && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
