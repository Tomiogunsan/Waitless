import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DateStrip,
  SlotGrid,
  SlotGridSkeleton,
} from "@/shared/slot-picker/slot-picker";
import Alert from "@/shared/alert/alert";
import Button from "@/shared/button/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/shared/dialog/dialog";
import { usePhysicianDay, useStaffReschedule } from "@/hooks/use-appointments";
import { openSlots } from "@/utils/scheduling";
import { bookableDates, formatDate, formatTimeRange } from "@/utils/time";
import type { IAppointmentDialogProp } from "./interface";

/** reschedule_appointment(): new time with the same physician. */
export function RescheduleDialog({
  appointment,
  onOpenChange,
}: IAppointmentDialogProp) {
  const dates = useMemo(() => bookableDates(), []);
  const [date, setDate] = useState(dates[0]!);
  const [slotAt, setSlotAt] = useState<string | null>(null);
  const { data: doctorDay = [], isPending: loadingSlots } = usePhysicianDay(
    appointment.physician.id,
    date,
  );
  const { mutate: reschedule, isPending, error } = useStaffReschedule();
  // The appointment being moved doesn't block its own new time.
  const slots = openSlots(doctorDay, date, new Date(), appointment.id);

  const confirm = () => {
    if (!slotAt) return;
    reschedule(
      { appointmentId: appointment.id, slotAt },
      {
        onSuccess: () => {
          toast.success("Appointment rescheduled", {
            description: `${appointment.patient.fullName} · ${formatDate(slotAt, "weekday")}, ${formatTimeRange(slotAt)}`,
          });
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        title={`Reschedule ${appointment.patient.fullName}`}
        description={`With ${appointment.physician.fullName} · currently ${formatTimeRange(appointment.scheduledAt)}`}
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
          {loadingSlots ? (
            <SlotGridSkeleton />
          ) : (
            <SlotGrid slots={slots} value={slotAt} onChange={setSlotAt} />
          )}
          {error && (
            <Alert tone="danger" icon={AlertTriangle} title={error.message} />
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={confirm} disabled={!slotAt} loading={isPending}>
            Move appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
