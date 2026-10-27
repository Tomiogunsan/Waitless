import { cn } from "@/utils/cn";
import type { IAlertProp, IAlertTone } from "./interface";

const TONES: Record<IAlertTone, string> = {
  info: "bg-brand-50 text-brand-900 ring-brand-200 [&_.alert-icon]:text-brand-600",
  warning: "bg-amber-50 text-amber-900 ring-amber-200 [&_.alert-icon]:text-amber-600",
  danger: "bg-red-50 text-red-900 ring-red-200 [&_.alert-icon]:text-red-600",
  success: "bg-emerald-50 text-emerald-900 ring-emerald-200 [&_.alert-icon]:text-emerald-600",
};

export default function Alert({ tone = "info", icon: Icon, title, children, action, className }: IAlertProp) {
  return (
    <div
      // Warnings and errors interrupt screen readers; info and success wait their turn.
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn("flex flex-wrap items-start gap-3 rounded-xl px-4 py-3 ring-1 ring-inset", TONES[tone], className)}
    >
      <Icon className="alert-icon mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 opacity-90">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
