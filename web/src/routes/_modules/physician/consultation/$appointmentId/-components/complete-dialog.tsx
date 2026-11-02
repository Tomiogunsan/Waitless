import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Alert from "@/shared/alert/alert";
import Button from "@/shared/button/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/shared/dialog/dialog";
import { usePhysicianDay } from "@/hooks/use-appointments";
import { useCompleteConsultation } from "@/hooks/use-consultation";
import { useNow } from "@/hooks/use-now";
import type { StaffAppointment } from "@/types/appointment";
import { pluralize } from "@/utils/format";
import { useCurrentUser } from "@/utils/session";
import {
  APPOINTMENT_MINUTES,
  clinicToday,
  formatDuration,
  minutesBetween,
} from "@/utils/time";

export function CompleteDialog({
  appointment,
  canComplete,
  onCompleted,
}: {
  appointment: StaffAppointment;
  canComplete: boolean;
  onCompleted: () => void;
}) {
  const me = useCurrentUser()!;
  const now = useNow();
  const date = useMemo(() => clinicToday(), []);
  const { data: mine = [] } = usePhysicianDay(me.id, date);
  const { mutate: complete, isPending, error } = useCompleteConsultation();
  const [open, setOpen] = useState(false);

  const endOfSlot = new Date(
    new Date(appointment.scheduledAt).getTime() + APPOINTMENT_MINUTES * 60_000,
  );
  const overrun = Math.max(0, minutesBetween(endOfSlot, now));
  const later = mine.filter(
    (a) => a.status === "scheduled" && a.scheduledAt > appointment.scheduledAt,
  );
  const shifts = overrun > 0 && later.length > 0;

  // The database moves the later appointments, or flags them for the front desk.
  const confirm = () =>
    complete(appointment.id, {
      onSuccess: () => {
        toast.success("Consultation completed", {
          description: shifts
            ? `${pluralize(later.length, "later appointment")} moved back by ${formatDuration(overrun)}, or flagged for the front desk.`
            : "Your queue is up to date.",
        });
        setOpen(false);
        onCompleted();
      },
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        onClick={() => setOpen(true)}
        disabled={!canComplete}
        title={canComplete ? undefined : "Save the visit note first"}
      >
        <CheckCircle2 aria-hidden />
        Complete consultation
      </Button>
      <DialogContent
        size="sm"
        title="Complete this consultation?"
        description="The patient leaves your queue and the front desk sees the visit as completed."
      >
        {shifts ? (
          <Alert
            tone="info"
            icon={Clock}
            title={`You ran ${formatDuration(overrun)} over`}
          >
            Your {pluralize(later.length, "later appointment")} today will move
            back by {formatDuration(overrun)} where possible, so no one is
            double-booked.
          </Alert>
        ) : (
          <p className="text-sm text-slate-600">
            You finished on time. Nothing else changes.
          </p>
        )}
        {error && (
          <Alert tone="danger" icon={AlertTriangle} title={error.message} />
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Not yet</Button>
          </DialogClose>
          <Button onClick={confirm} loading={isPending}>
            Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
