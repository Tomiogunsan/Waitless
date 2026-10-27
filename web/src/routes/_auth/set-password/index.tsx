import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CheckCircle2, Circle, Stethoscope } from "lucide-react";
import { useState, type FormEvent } from "react";
import Button from "@/shared/button/button";
import { buttonStyles } from "@/shared/button/button-styles";
import Field from "@/shared/form-field/form-field";
import Input from "@/shared/input/input";
import Badge from "@/shared/badge/badge";
import { cn } from "@/utils/cn";

// Invite emails land here. The invite link signs the person in, and this
// page calls supabase.auth.updateUser({ password }).
export const Route = createFileRoute("/_auth/set-password/")({
  component: SetPasswordPage,
});

const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "A number", test: (p: string) => /\d/.test(p) },
  { label: "An uppercase and a lowercase letter", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
];

const STRENGTH = [
  { label: "Too weak", bar: "bg-red-500" },
  { label: "Weak", bar: "bg-amber-500" },
  { label: "Almost there", bar: "bg-brand-400" },
  { label: "Strong", bar: "bg-emerald-500" },
];

function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const passed = RULES.filter((rule) => rule.test(password)).length;
  const strength = STRENGTH[passed]!;
  const mismatch = confirm.length > 0 && confirm !== password;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (passed < RULES.length || confirm !== password) return;
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      setDone(true);
    }, 700);
  };

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
          <Check className="size-7" strokeWidth={3} aria-hidden />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">You're all set</h1>
        <p className="mt-2 text-sm text-slate-500">Your password is saved. Sign in to see your queue.</p>
        <Link to="/login" className={cn(buttonStyles({ size: "lg" }), "mt-8 w-full")}>
          Continue to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <Badge tone="brand" size="md" icon={Stethoscope}>
        Invited as Physician · Paediatrics
      </Badge>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">Welcome to Waitless, Dr. Ogunleye</h1>
      <p className="mt-1.5 text-sm text-slate-500">Choose a password to finish setting up your account.</p>

      <form noValidate onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Field label="New password" error={submitted && passed < RULES.length ? "Your password doesn't meet all the requirements yet." : undefined}>
          {(a11y) => <Input {...a11y} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>

        <div aria-live="polite">
          <div className="flex gap-1.5" aria-hidden>
            {RULES.map((_, i) => (
              <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i < passed ? strength.bar : "bg-slate-100")} />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Strength: <span className="font-medium text-slate-700">{password ? strength.label : "Not set"}</span>
          </p>
          <ul className="mt-3 space-y-1.5">
            {RULES.map((rule) => {
              const ok = rule.test(password);
              const Icon = ok ? CheckCircle2 : Circle;
              return (
                <li key={rule.label} className={cn("flex items-center gap-2 text-sm", ok ? "text-emerald-700" : "text-slate-500")}>
                  <Icon className="size-4" aria-hidden />
                  {rule.label}
                  <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <Field label="Confirm password" error={mismatch || (submitted && confirm !== password) ? "Passwords don't match." : undefined}>
          {(a11y) => <Input {...a11y} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={saving}>
          Save password
        </Button>
      </form>
    </>
  );
}
