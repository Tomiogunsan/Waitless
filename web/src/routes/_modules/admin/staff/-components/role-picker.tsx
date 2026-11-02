import { ROLE_ICONS, ROLE_LABELS } from "@/helpers/user-role";
import type { StaffRole } from "@/types/clinic";
import { cn } from "@/utils/cn";
import { ROLE_OPTIONS } from "../-constants/staff";

export function RolePicker({
  value,
  onChange,
  disabled,
}: {
  value: StaffRole;
  onChange: (role: StaffRole) => void;
  disabled?: (role: StaffRole) => boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Role" className="grid gap-2 sm:grid-cols-3">
      {ROLE_OPTIONS.map(({ role, description }) => {
        const Icon = ROLE_ICONS[role];
        const selected = role === value;
        return (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled?.(role)}
            onClick={() => onChange(role)}
            className={cn(
              "rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40",
              selected
                ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20"
                : "border-slate-200 hover:border-brand-300",
            )}
          >
            <Icon className={cn("size-5", selected ? "text-brand-600" : "text-slate-400")} aria-hidden />
            <span className="mt-2 block text-sm font-semibold text-slate-900">{ROLE_LABELS[role]}</span>
            <span className="mt-0.5 block text-xs leading-snug text-slate-500">{description}</span>
          </button>
        );
      })}
    </div>
  );
}
