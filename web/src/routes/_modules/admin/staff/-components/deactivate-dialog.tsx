import { AlertTriangle, ArrowRightLeft, Check, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import Alert from "@/shared/alert/alert";
import Button from "@/shared/button/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/shared/dialog/dialog";
import { useDepartments } from "@/hooks/use-booking";
import {
  useActiveAppointmentCounts,
  useReassignPhysicianAppointments,
  useSetStaffActive,
} from "@/hooks/use-staff";
import type { StaffMember } from "@/types/staff";
import { pluralize } from "@/utils/format";

export function DeactivateDialog({
  member,
  onClose,
}: {
  member: StaffMember;
  onClose: () => void;
}) {
  const { data: departments = [] } = useDepartments();
  const { data: activeCounts = {} } = useActiveAppointmentCounts();
  const {
    mutate: reassign,
    data: result,
    isPending: reassigning,
    error: reassignError,
  } = useReassignPhysicianAppointments();
  const {
    mutate: setActive,
    isPending: deactivating,
    error: deactivateError,
  } = useSetStaffActive();
  const blocking = activeCounts[member.id] ?? 0;
  const department = departments.find((d) => d.id === member.departmentId)?.name;
  const error = reassignError ?? deactivateError;

  const deactivate = () =>
    setActive(
      { staffId: member.id, active: false },
      {
        onSuccess: () => {
          toast(`${member.fullName} deactivated`, {
            description: "Their access ends immediately and they can't sign in.",
          });
          onClose();
        },
      },
    );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        size="sm"
        title={`Deactivate ${member.fullName}?`}
        description="They lose access straight away. Their records are kept and you can reactivate them later."
      >
        <div className="space-y-4">
          {result && (
            <Alert
              tone={result.needsReview ? "warning" : "success"}
              icon={result.needsReview ? ShieldAlert : Check}
              title={`${result.reassigned} moved to colleagues, ${result.needsReview} flagged for review`}
            >
              {result.needsReview > 0 &&
                "No colleague is free at those times. The front desk needs to reschedule or cancel them first."}
            </Alert>
          )}
          {blocking > 0 && !result && (
            <>
              <Alert
                tone="warning"
                icon={ArrowRightLeft}
                title={`${pluralize(blocking, "active appointment")} still assigned`}
              >
                Move them to free colleagues{department ? ` in ${department}` : ""} before deactivating.
              </Alert>
              <Button
                variant="soft"
                className="w-full"
                loading={reassigning}
                onClick={() => reassign(member.id)}
              >
                <ArrowRightLeft aria-hidden />
                Reassign appointments
              </Button>
            </>
          )}
          {blocking === 0 && !result && (
            <p className="text-sm text-slate-600">
              Nothing is assigned to them, so they can be deactivated now.
            </p>
          )}
          {error && <Alert tone="danger" icon={AlertTriangle} title={error.message} />}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button variant="danger" onClick={deactivate} loading={deactivating} disabled={blocking > 0}>
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
