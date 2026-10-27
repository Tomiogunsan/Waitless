import { Check, Search, Sparkles, UserPlus } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { DateStrip, SlotGrid } from "@/shared/slot-picker/slot-picker";
import Avatar from "@/shared/avatar/avatar";
import Badge from "@/shared/badge/badge";
import Button from "@/shared/button/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/shared/dialog/dialog";
import Field from "@/shared/form-field/form-field";
import Select from "@/shared/select/select";
import Textarea from "@/shared/textarea/textarea";
import { cn } from "@/utils/cn";
import { demoNow } from "@/utils/demo-clock";
import { formatPhone } from "@/utils/format";
import {
  isPhysicianFree,
  newReferenceCode,
  physicianSlots,
} from "@/utils/scheduling";
import { bookableDates, formatDate, formatTimeRange } from "@/utils/time";
import {
  departments,
  getDepartment,
  getStaff,
  physicians,
} from "@/mocks/clinic";
import {
  appointmentStore,
  patientStore,
  useAppointments,
  usePatients,
} from "@/mocks/store";
import type { Appointment } from "@/types/clinic";

interface AppointmentDialogProps {
  appointment: Appointment | null;
  onOpenChange: (open: boolean) => void;
}

/** reassign_appointment(): same time, another physician in the same department. */
export function ReassignDialog({
  appointment,
  onOpenChange,
}: AppointmentDialogProps) {
  const all = useAppointments();
  const [choice, setChoice] = useState<string>("auto");

  const candidates = useMemo(() => {
    if (!appointment) return [];
    return physicians()
      .filter(
        (p) =>
          p.department_id === appointment.department_id &&
          p.id !== appointment.physician_id,
      )
      .map((p) => ({
        physician: p,
        free: isPhysicianFree(
          all,
          p.id,
          appointment.scheduled_at,
          appointment.id,
        ),
      }));
  }, [all, appointment]);

  if (!appointment) return null;
  const patient = patientStore.get(appointment.patient_id)!;
  const firstFree = candidates.find((c) => c.free);
  const target =
    choice === "auto"
      ? firstFree?.physician
      : candidates.find((c) => c.physician.id === choice)?.physician;

  const confirm = () => {
    if (!target) return;
    appointmentStore.update(appointment.id, {
      physician_id: target.id,
      reschedule_needs_review: false,
      reschedule_review_reason: null,
    });
    toast.success(`Reassigned to ${target.full_name}`, {
      description: `${patient.full_name} keeps the ${formatTimeRange(appointment.scheduled_at)} slot.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        title="Reassign appointment"
        description={`${patient.full_name} · ${formatTimeRange(appointment.scheduled_at)} · ${getDepartment(appointment.department_id)?.name}`}
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
                ? `Currently ${firstFree.physician.full_name}`
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
              title={physician.full_name}
              subtitle={free ? "Free at this time" : "Busy at this time"}
              leading={<Avatar name={physician.full_name} />}
            />
          ))}
          {candidates.length === 0 && (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              There are no other doctors in this department. Reschedule or
              cancel the appointment instead.
            </p>
          )}
        </fieldset>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={confirm} disabled={!target}>
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

/** reschedule_appointment(): new time with the same physician. */
export function RescheduleDialog({
  appointment,
  onOpenChange,
}: AppointmentDialogProps) {
  const all = useAppointments();
  const dates = useMemo(() => bookableDates(), []);
  const [date, setDate] = useState(dates[0]!);
  const [slotAt, setSlotAt] = useState<string | null>(null);

  if (!appointment) return null;
  const patient = patientStore.get(appointment.patient_id)!;
  const physician = getStaff(appointment.physician_id)!;
  const slots = physicianSlots(
    all,
    physician.id,
    date,
    demoNow(),
    appointment.id,
  );

  const confirm = () => {
    if (!slotAt) return;
    appointmentStore.update(appointment.id, {
      scheduled_at: slotAt,
      status: "scheduled",
      checked_in_at: null,
      reschedule_needs_review: false,
      reschedule_review_reason: null,
    });
    toast.success("Appointment rescheduled", {
      description: `${patient.full_name} · ${formatDate(slotAt, "weekday")}, ${formatTimeRange(slotAt)}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        title={`Reschedule ${patient.full_name}`}
        description={`With ${physician.full_name} · currently ${formatTimeRange(appointment.scheduled_at)}`}
      >
        <div className="space-y-6">
          <DateStrip
            dates={dates}
            value={date}
            onChange={(d) => {
              setDate(d);
              setSlotAt(null);
            }}
          />
          <SlotGrid slots={slots} value={slotAt} onChange={setSlotAt} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={confirm} disabled={!slotAt}>
            Move appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** cancel_appointment(): with an optional reason. */
export function CancelAppointmentDialog({
  appointment,
  onOpenChange,
}: AppointmentDialogProps) {
  const [reason, setReason] = useState("");
  if (!appointment) return null;
  const patient = patientStore.get(appointment.patient_id)!;

  const confirm = () => {
    appointmentStore.update(appointment.id, {
      status: "cancelled",
      cancellation_reason: reason.trim() || null,
      reschedule_needs_review: false,
      reschedule_review_reason: null,
    });
    toast(`${patient.full_name}'s appointment was cancelled`);
    onOpenChange(false);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title="Cancel appointment?"
        description={`${patient.full_name} · ${formatTimeRange(appointment.scheduled_at)} with ${getStaff(appointment.physician_id)?.full_name}`}
      >
        <Field label="Reason" optional>
          {(a11y) => (
            <Textarea
              {...a11y}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Patient called to cancel"
              className="min-h-20"
            />
          )}
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep it</Button>
          </DialogClose>
          <Button variant="danger" onClick={confirm}>
            Cancel appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** book_appointment(): front desk books for an existing patient. */
export function NewAppointmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const all = useAppointments();
  const dates = useMemo(() => bookableDates(), []);
  const doctorList = physicians();
  const patients = usePatients();
  const [query, setQuery] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [physicianId, setPhysicianId] = useState(doctorList[0]!.id);
  const [date, setDate] = useState(dates[0]!);
  const [slotAt, setSlotAt] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return patients
      .filter(
        (p) =>
          !q ||
          p.full_name.toLowerCase().includes(q) ||
          (digits.length > 2 && p.phone.includes(digits.replace(/^0/, ""))),
      )
      .slice(0, 5);
  }, [patients, query]);

  const slots = physicianSlots(all, physicianId, date, demoNow());
  const patient = patientId ? patientStore.get(patientId) : undefined;

  const reset = () => {
    setQuery("");
    setPatientId(null);
    setSlotAt(null);
  };

  const confirm = () => {
    if (!patient || !slotAt) return;
    const physician = getStaff(physicianId)!;
    appointmentStore.add({
      id: `apt-new-${crypto.randomUUID()}`,
      reference_code: newReferenceCode(),
      patient_id: patient.id,
      physician_id: physician.id,
      department_id: physician.department_id!,
      original_scheduled_at: slotAt,
      scheduled_at: slotAt,
      checked_in_at: null,
      actual_started_at: null,
      actual_ended_at: null,
      status: "scheduled",
      cancellation_reason: null,
      reschedule_needs_review: false,
      reschedule_review_reason: null,
    });
    toast.success("Appointment booked", {
      description: `${patient.full_name} with ${physician.full_name}, ${formatDate(slotAt, "weekday")} ${formatTimeRange(slotAt)}`,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent
        size="lg"
        title="New appointment"
        description="Book a returning patient in with a specific doctor."
      >
        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-medium text-slate-700">Patient</h3>
            {patient ? (
              <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
                <Avatar name={patient.full_name} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {patient.full_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatPhone(patient.phone)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPatientId(null)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200">
                <div className="relative border-b border-slate-100">
                  <Search
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or phone"
                    aria-label="Search patients"
                    className="h-11 w-full rounded-t-xl bg-transparent pr-3 pl-9 text-sm focus:outline-none"
                  />
                </div>
                <ul className="max-h-52 overflow-y-auto p-1.5">
                  {matches.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setPatientId(p.id)}
                        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50"
                      >
                        <Avatar name={p.full_name} size="xs" />
                        <span className="flex-1 text-sm text-slate-900">
                          {p.full_name}
                        </span>
                        <span className="tabular text-xs text-slate-500">
                          {formatPhone(p.phone)}
                        </span>
                      </button>
                    </li>
                  ))}
                  {matches.length === 0 && (
                    <li className="flex items-center gap-2 px-2.5 py-3 text-sm text-slate-500">
                      <UserPlus className="size-4" aria-hidden />
                      No match. Register the patient from the Patients page
                      first.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </section>

          <Field label="Doctor">
            {(a11y) => (
              <Select
                {...a11y}
                value={physicianId}
                onChange={(e) => {
                  setPhysicianId(e.target.value);
                  setSlotAt(null);
                }}
              >
                {departments.map((d) => (
                  <optgroup key={d.id} label={d.name}>
                    {doctorList
                      .filter((p) => p.department_id === d.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </Select>
            )}
          </Field>

          <section className="space-y-5">
            <h3 className="text-sm font-medium text-slate-700">
              Date and time
            </h3>
            <DateStrip
              dates={dates}
              value={date}
              onChange={(d) => {
                setDate(d);
                setSlotAt(null);
              }}
            />
            <SlotGrid slots={slots} value={slotAt} onChange={setSlotAt} />
          </section>
        </div>
        <DialogFooter className="sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {patient && slotAt ? (
              <Badge tone="brand">
                {formatDate(slotAt, "weekday")} · {formatTimeRange(slotAt)}
              </Badge>
            ) : (
              "Choose a patient and a slot"
            )}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={confirm} disabled={!patient || !slotAt}>
              Book appointment
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
