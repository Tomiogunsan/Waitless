import { AlertTriangle, Search, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DateStrip,
  SlotGrid,
  SlotGridSkeleton,
} from "@/shared/slot-picker/slot-picker";
import Alert from "@/shared/alert/alert";
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
import {
  useBookForPatient,
  usePatientSearch,
  usePhysicianDay,
  usePhysicians,
} from "@/hooks/use-appointments";
import { useDepartments } from "@/hooks/use-booking";
import type { PatientSummary } from "@/types/appointment";
import { formatPhone } from "@/utils/format";
import { openSlots } from "@/utils/scheduling";
import { bookableDates, formatDate, formatTimeRange } from "@/utils/time";

/** book_appointment(): front desk books for an existing patient. */
export function NewAppointmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dates = useMemo(() => bookableDates(), []);
  const [query, setQuery] = useState("");
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [physicianId, setPhysicianId] = useState("");
  const [date, setDate] = useState(dates[0]!);
  const [slotAt, setSlotAt] = useState<string | null>(null);

  const { data: departments = [] } = useDepartments();
  const { data: physicians = [] } = usePhysicians();
  const { data: matches = [], isFetching: searching } = usePatientSearch(query);
  // Until a doctor is picked, use the first one in the list.
  const doctorId = physicianId || physicians[0]?.id;
  const { data: doctorDay = [], isPending: loadingSlots } = usePhysicianDay(
    doctorId,
    date,
  );
  const { mutate: book, isPending, error, reset: clearError } =
    useBookForPatient();
  const slots = openSlots(doctorDay, date, new Date());
  const typedEnough = query.trim().length >= 2;

  const reset = () => {
    setQuery("");
    setPatient(null);
    setSlotAt(null);
    clearError();
  };

  const confirm = () => {
    if (!patient || !slotAt || !doctorId) return;
    const physician = physicians.find((p) => p.id === doctorId);
    book(
      { patientId: patient.id, physicianId: doctorId, slotAt },
      {
        onSuccess: () => {
          toast.success("Appointment booked", {
            description: `${patient.fullName} with ${physician?.fullName}, ${formatDate(slotAt, "weekday")} ${formatTimeRange(slotAt)}`,
          });
          reset();
          onOpenChange(false);
        },
      },
    );
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
                <Avatar name={patient.fullName} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {patient.fullName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatPhone(patient.phone)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPatient(null)}
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
                <ul
                  className="max-h-52 overflow-y-auto p-1.5"
                  aria-busy={searching || undefined}
                >
                  {!typedEnough && (
                    <li className="px-2.5 py-3 text-sm text-slate-500">
                      Type at least 2 letters or digits to search.
                    </li>
                  )}
                  {typedEnough &&
                    matches.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setPatient(p)}
                          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50"
                        >
                          <Avatar name={p.fullName} size="xs" />
                          <span className="flex-1 text-sm text-slate-900">
                            {p.fullName}
                          </span>
                          <span className="tabular text-xs text-slate-500">
                            {formatPhone(p.phone)}
                          </span>
                        </button>
                      </li>
                    ))}
                  {typedEnough && !searching && matches.length === 0 && (
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
                value={doctorId ?? ""}
                onChange={(e) => {
                  setPhysicianId(e.target.value);
                  setSlotAt(null);
                }}
              >
                {departments.map((d) => (
                  <optgroup key={d.id} label={d.name}>
                    {physicians
                      .filter((p) => p.departmentId === d.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName}
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
            {loadingSlots ? (
              <SlotGridSkeleton />
            ) : (
              <SlotGrid slots={slots} value={slotAt} onChange={setSlotAt} />
            )}
          </section>
          {error && (
            <Alert tone="danger" icon={AlertTriangle} title={error.message} />
          )}
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
            <Button
              onClick={confirm}
              disabled={!patient || !slotAt}
              loading={isPending}
            >
              Book appointment
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
