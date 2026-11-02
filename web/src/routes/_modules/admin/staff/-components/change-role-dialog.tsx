import { AlertTriangle, ShieldAlert } from "lucide-react";
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
import Select from "@/shared/select/select";
import { ROLE_LABELS } from "@/helpers/user-role";
import { useDepartments } from "@/hooks/use-booking";
import { useChangeStaffRole, usePhysicianHasHistory } from "@/hooks/use-staff";
import type { StaffMember } from "@/types/staff";
import { RolePicker } from "./role-picker";

export function ChangeRoleDialog({
  member,
  onClose,
}: {
  member: StaffMember;
  onClose: () => void;
}) {
  const { data: departments = [] } = useDepartments();
  const { data: hasHistory = false } = usePhysicianHasHistory(
    member.role === "physician" ? member.id : undefined,
  );
  const { mutate: changeRole, isPending, error } = useChangeStaffRole();
  const [role, setRole] = useState(member.role);
  const [departmentId, setDepartmentId] = useState(member.departmentId ?? "");
  const unchanged =
    role === member.role && (role !== "physician" || departmentId === member.departmentId);

  const save = () =>
    changeRole(
      { staffId: member.id, role, departmentId: role === "physician" ? departmentId : null },
      {
        onSuccess: () => {
          toast.success(
            `${member.fullName} is now ${role === "admin" ? "an" : "a"} ${ROLE_LABELS[role].toLowerCase()}`,
          );
          onClose();
        },
      },
    );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent size="lg" title={`Change ${member.fullName}'s role`}>
        <div className="space-y-5">
          {hasHistory && (
            <Alert tone="info" icon={ShieldAlert} title="This physician has appointment history">
              Clinical records must keep a physician, so they can only move department. To take them
              off clinical work, deactivate the account.
            </Alert>
          )}
          <RolePicker
            value={role}
            onChange={setRole}
            disabled={(r) => hasHistory && r !== "physician"}
          />
          {role === "physician" && (
            <Field label="Department">
              {(a11y) => (
                <Select {...a11y} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  <option value="">Choose a department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          {error && <Alert tone="danger" icon={AlertTriangle} title={error.message} />}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button
            onClick={save}
            loading={isPending}
            disabled={unchanged || (role === "physician" && !departmentId)}
          >
            Save role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
