import { AlertTriangle, Pencil } from "lucide-react";
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
import { useUpdatePatientContact } from "@/hooks/use-patients";
import type { PatientRecord } from "@/types/patient";
import {
  formatPhone,
  isValidEmail,
  isValidPhone,
  normalizePhone,
} from "@/utils/format";

export function EditContactDialog({ patient }: { patient: PatientRecord }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({
    fullName: patient.fullName,
    phone: formatPhone(patient.phone),
    email: patient.email ?? "",
  });
  const [submitted, setSubmitted] = useState(false);
  const { mutate: update, isPending, error, reset } = useUpdatePatientContact();

  const errors = {
    fullName: values.fullName.trim() ? undefined : "Enter a name",
    phone: isValidPhone(values.phone)
      ? undefined
      : "Enter a valid phone number",
    email:
      !values.email || isValidEmail(values.email)
        ? undefined
        : "Enter a valid email address",
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    update(
      {
        patientId: patient.id,
        input: {
          fullName: values.fullName.trim(),
          phone: normalizePhone(values.phone),
          email: values.email.trim(),
        },
      },
      {
        onSuccess: () => {
          toast.success("Contact details updated");
          setOpen(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        setOpen(next);
      }}
    >
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Pencil aria-hidden />
        Edit contact
      </Button>
      <DialogContent size="sm" title="Edit contact details">
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
            error={submitted ? errors.phone : undefined}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="tel"
                value={values.phone}
                onChange={(e) =>
                  setValues((v) => ({ ...v, phone: e.target.value }))
                }
              />
            )}
          </Field>
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
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
