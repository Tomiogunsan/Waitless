import { ArrowRight, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import Button from "@/shared/button/button";
import Field from "@/shared/form-field/form-field";
import Input from "@/shared/input/input";
import { isValidEmail, isValidPhone, normalizePhone } from "@/utils/format";

export interface Details {
  fullName: string;
  phone: string;
  email: string;
}

export function DetailsForm({ onSubmit }: { onSubmit: (details: Details) => void }) {
  const [values, setValues] = useState<Details>({
    fullName: "",
    phone: "",
    email: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors = {
    fullName: values.fullName.trim() ? undefined : "Enter your full name",
    phone: isValidPhone(values.phone)
      ? undefined
      : "Enter a valid phone number, e.g. 0803 123 4567",
    email:
      !values.email || isValidEmail(values.email)
        ? undefined
        : "Enter a valid email address",
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key: keyof Details) => (submitted ? errors[key] : undefined);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    setSaving(true);
    // Simulates the network round trip to book_public_appointment.
    window.setTimeout(() => onSubmit(values), 700);
  };

  const update =
    (key: keyof Details) => (event: { target: { value: string } }) =>
      setValues((v) => ({ ...v, [key]: event.target.value }));

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      <Field label="Full name" error={show("fullName")}>
        {(a11y) => (
          <Input
            {...a11y}
            autoComplete="name"
            value={values.fullName}
            onChange={update("fullName")}
            placeholder="e.g. Amaka Obi"
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Phone number"
          error={show("phone")}
          hint={
            isValidPhone(values.phone)
              ? `We'll use ${normalizePhone(values.phone)} to find your booking`
              : "Returning patient? Use the same number as before."
          }
        >
          {(a11y) => (
            <Input
              {...a11y}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={update("phone")}
              placeholder="0803 123 4567"
            />
          )}
        </Field>
        <Field label="Email" optional error={show("email")}>
          {(a11y) => (
            <Input
              {...a11y}
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={update("email")}
              placeholder="you@example.com"
            />
          )}
        </Field>
      </div>
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="size-4 shrink-0 text-brand-600" aria-hidden />
          Only clinic staff can see your details.
        </p>
        <Button type="submit" size="lg" loading={saving}>
          Confirm booking
          {!saving && <ArrowRight aria-hidden />}
        </Button>
      </div>
    </form>
  );
}
