import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Alert from "@/shared/alert/alert";
import Button from "@/shared/button/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/shared/dialog/dialog";
import Field from "@/shared/form-field/form-field";
import Textarea from "@/shared/textarea/textarea";
import { useStaffCancel } from "@/hooks/use-appointments";
import { formatTimeRange } from "@/utils/time";
import type { IAppointmentDialogProp } from "./interface";

/** cancel_appointment(): with an optional reason. */
export function CancelAppointmentDialog({
  appointment,
  onOpenChange,
}: IAppointmentDialogProp) {
  const [reason, setReason] = useState("");
  const { mutate: cancel, isPending, error } = useStaffCancel();

  const confirm = () =>
    cancel(
      { appointmentId: appointment.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast(`${appointment.patient.fullName}'s appointment was cancelled`);
          onOpenChange(false);
        },
      },
    );

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title="Cancel appointment?"
        description={`${appointment.patient.fullName} · ${formatTimeRange(appointment.scheduledAt)} with ${appointment.physician.fullName}`}
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
        {error && (
          <Alert tone="danger" icon={AlertTriangle} title={error.message} />
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep it</Button>
          </DialogClose>
          <Button variant="danger" onClick={confirm} loading={isPending}>
            Cancel appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
