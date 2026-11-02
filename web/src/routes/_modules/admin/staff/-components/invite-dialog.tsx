import { AlertTriangle, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
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
import Input from "@/shared/input/input";
import Select from "@/shared/select/select";
import { useDepartments } from "@/hooks/use-booking";
import { useInviteStaff, useStaffDirectory } from "@/hooks/use-staff";
import type { StaffRole } from "@/types/clinic";
import { isValidEmail } from "@/utils/format";
import { RolePicker } from "./role-picker";

const EMPTY = { email: "", fullName: "", role: "physician" as StaffRole, departmentId: "" };

export function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: members = [] } = useStaffDirectory();
  const { data: departments = [] } = useDepartments();
  const { mutate: invite, isPending, error, reset } = useInviteStaff();
  const [values, setValues] = useState(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  const email = values.email.trim().toLowerCase();
  const taken = members.some((m) => m.email === email);
  const errors = {
    email: !isValidEmail(values.email)
      ? "Enter a valid email address"
      : taken
        ? "Someone with this email is already on the team"
        : undefined,
    fullName: values.fullName.trim() ? undefined : "Enter their full name",
    department:
      values.role === "physician" && !values.departmentId
        ? "Physicians must belong to a department"
        : undefined,
  };

  const close = () => {
    setValues(EMPTY);
    setSubmitted(false);
    reset();
    onOpenChange(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    invite(
      {
        email,
        fullName: values.fullName.trim(),
        role: values.role,
        departmentId: values.role === "physician" ? values.departmentId : null,
      },
      {
        onSuccess: () => {
          toast.success("Invite sent", {
            description: `${email} will get an email to set their password.${values.role === "physician" ? " Clinic hours were added automatically." : ""}`,
          });
          close();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent
        size="lg"
        title="Invite a staff member"
        description="They'll get an email with a link to set their password."
      >
        <form noValidate onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={submitted ? errors.fullName : undefined}>
              {(a11y) => (
                <Input
                  {...a11y}
                  value={values.fullName}
                  onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
                  placeholder="Dr. Yemi Ogunleye"
                />
              )}
            </Field>
            <Field label="Work email" error={submitted || taken ? errors.email : undefined}>
              {(a11y) => (
                <Input
                  {...a11y}
                  type="email"
                  value={values.email}
                  onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                  placeholder="name@waitless.health"
                />
              )}
            </Field>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Role</p>
            <RolePicker value={values.role} onChange={(role) => setValues((v) => ({ ...v, role }))} />
          </div>
          {values.role === "physician" && (
            <Field
              label="Department"
              error={submitted ? errors.department : undefined}
              hint="Mon–Fri 08:40–17:00 working hours are set up automatically."
            >
              {(a11y) => (
                <Select
                  {...a11y}
                  value={values.departmentId}
                  onChange={(e) => setValues((v) => ({ ...v, departmentId: e.target.value }))}
                >
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
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={isPending}>
              <Send aria-hidden />
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
