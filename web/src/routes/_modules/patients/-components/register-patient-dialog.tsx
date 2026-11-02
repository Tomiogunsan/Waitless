import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import Alert from "@/shared/alert/alert";
import Button from "@/shared/button/button";
import { buttonStyles } from "@/shared/button/button-styles";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/shared/dialog/dialog";
import Field from "@/shared/form-field/form-field";
import Input from "@/shared/input/input";
import { usePatientByPhone, useRegisterPatient } from "@/hooks/use-patients";
import { cn } from "@/utils/cn";
import { isValidEmail, isValidPhone, normalizePhone } from "@/utils/format";

const EMPTY = { fullName: "", phone: "", email: "" };

export function RegisterPatientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [values, setValues] = useState(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const validPhone = isValidPhone(values.phone);
  // Phone numbers are unique, so warn before the database would reject it.
  const { data: existing } = usePatientByPhone(
    validPhone ? normalizePhone(values.phone) : null,
  );
  const { mutate: register, isPending, error, reset } = useRegisterPatient();

  const errors = {
    fullName: values.fullName.trim()
      ? undefined
      : "Enter the patient's full name",
    phone: !validPhone
      ? "Enter a valid phone number"
      : existing
        ? "This number already belongs to a patient"
        : undefined,
    email:
      !values.email || isValidEmail(values.email)
        ? undefined
        : "Enter a valid email address",
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
    register(
      {
        fullName: values.fullName.trim(),
        phone: normalizePhone(values.phone),
        email: values.email.trim(),
      },
      {
        onSuccess: (patient) => {
          toast.success(`${patient.fullName} registered`);
          close();
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent
        title="Register patient"
        description="Add a walk-in or phone patient. They can then be booked in."
      >
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Full name"
            error={submitted ? errors.fullName : undefined}
          >
            {(a11y) => (
              <Input
                {...a11y}
                value={values.fullName}
                onChange={(e) =>
                  setValues((v) => ({ ...v, fullName: e.target.value }))
                }
              />
            )}
          </Field>
          <Field
            label="Phone number"
            error={submitted || existing ? errors.phone : undefined}
            hint={
              validPhone
                ? `Saved as ${normalizePhone(values.phone)}`
                : "Nigerian numbers like 0803 123 4567 are converted automatically."
            }
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="tel"
                value={values.phone}
                onChange={(e) =>
                  setValues((v) => ({ ...v, phone: e.target.value }))
                }
                placeholder="0803 123 4567"
              />
            )}
          </Field>
          {existing && (
            <Link
              to="/patients/$patientId"
              params={{ patientId: existing.id }}
              className={cn(
                buttonStyles({ variant: "soft", size: "sm" }),
                "w-full",
              )}
            >
              Open {existing.fullName}'s record instead
            </Link>
          )}
          <Field
            label="Email"
            optional
            error={submitted ? errors.email : undefined}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="email"
                value={values.email}
                onChange={(e) =>
                  setValues((v) => ({ ...v, email: e.target.value }))
                }
              />
            )}
          </Field>
          {error && (
            <Alert tone="danger" icon={AlertTriangle} title={error.message} />
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={isPending}>
              Register patient
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
