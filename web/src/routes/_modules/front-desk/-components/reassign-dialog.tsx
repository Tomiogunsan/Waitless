import { AlertTriangle, Check, Sparkles } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import Alert from "@/shared/alert/alert";
import Avatar from "@/shared/avatar/avatar";
import Button from "@/shared/button/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/shared/dialog/dialog";
import {
  useDayAppointments,
  usePhysicians,
  useReassign,
} from "@/hooks/use-appointments";
import { cn } from "@/utils/cn";
import { isSlotFree } from "@/utils/scheduling";
import { clinicToday, formatTimeRange } from "@/utils/time";
import type { IAppointmentDialogProp } from "./interface";

/** reassign_appointment(): same time, another physician in the same department. */
export function ReassignDialog({
  appointment,
  onOpenChange,
}: IAppointmentDialogProp) {
  const [choice, setChoice] = useState<string>("auto");
  const { data: physicians = [] } = usePhysicians();
  // The page has already loaded this day, so this reads from the cache.
  const { data: day = [] } = useDayAppointments(
    clinicToday(new Date(appointment.scheduledAt)),
  );
  const { mutate: reassign, isPending, error } = useReassign();

  const candidates = useMemo(
    () =>
      physicians
        .filter(
          (p) =>
            p.departmentId === appointment.department.id &&
            p.id !== appointment.physician.id,
        )
        .map((p) => ({
          physician: p,
          free: isSlotFree(
            day.filter((a) => a.physician.id === p.id),
            appointment.scheduledAt,
            appointment.id,
          ),
        })),
    [physicians, day, appointment],
  );

  const firstFree = candidates.find((c) => c.free);
  const target =
    choice === "auto"
      ? firstFree?.physician
      : candidates.find((c) => c.physician.id === choice)?.physician;

  const confirm = () => {
    if (!target) return;
    reassign(
      {
        appointmentId: appointment.id,
        // "auto" lets the database pick the first free doctor.
        physicianId: choice === "auto" ? undefined : target.id,
      },
      {
        onSuccess: (newPhysicianId) => {
          const name =
            physicians.find((p) => p.id === newPhysicianId)?.fullName ??
            target.fullName;
          toast.success(`Reassigned to ${name}`, {
            description: `${appointment.patient.fullName} keeps the ${formatTimeRange(appointment.scheduledAt)} slot.`,
          });
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        title="Reassign appointment"
        description={`${appointment.patient.fullName} · ${formatTimeRange(appointment.scheduledAt)} · ${appointment.department.name}`}
      >
        <fieldset className="space-y-2">
          <legend className="mb-3 text-sm font-medium text-slate-700">
            Move to
          </legend>
          <ChoiceRow
            selected={choice === "auto"}
            onSelect={() => setChoice("auto")}
            disabled={!firstFree}
            title="First available doctor"
            subtitle={
              firstFree
                ? `Currently ${firstFree.physician.fullName}`
                : "No one else is free at this time"
            }
            leading={
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-white">
                <Sparkles className="size-4" aria-hidden />
              </span>
            }
          />
          {candidates.map(({ physician, free }) => (
            <ChoiceRow
              key={physician.id}
              selected={choice === physician.id}
              onSelect={() => setChoice(physician.id)}
              disabled={!free}
              title={physician.fullName}
              subtitle={free ? "Free at this time" : "Busy at this time"}
              leading={<Avatar name={physician.fullName} />}
            />
          ))}
          {candidates.length === 0 && (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              There are no other doctors in this department. Reschedule or
              cancel the appointment instead.
            </p>
          )}
        </fieldset>
        {error && (
          <Alert tone="danger" icon={AlertTriangle} title={error.message} />
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={confirm} disabled={!target} loading={isPending}>
            Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChoiceRow({
  selected,
  onSelect,
  disabled,
  title,
  subtitle,
  leading,
}: {
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  title: string;
  subtitle: string;
  leading: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20"
          : "border-slate-200 hover:border-brand-300",
      )}
    >
      {leading}
      <span className="flex-1">
        <span className="block text-sm font-medium text-slate-900">
          {title}
        </span>
        <span className="block text-xs text-slate-500">{subtitle}</span>
      </span>
      {selected && <Check className="size-4 text-brand-600" aria-hidden />}
    </button>
  );
}
