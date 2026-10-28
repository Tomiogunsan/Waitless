import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CheckCircle2, Circle, Link2Off } from "lucide-react";
import { useState, type FormEvent } from "react";
import Button from "@/shared/button/button";
import { buttonStyles } from "@/shared/button/button-styles";
import Field from "@/shared/form-field/form-field";
import Input from "@/shared/input/input";
import Badge from "@/shared/badge/badge";
import { cn } from "@/utils/cn";
import { useCurrentUser } from "@/utils/session";
import { setPassword as savePassword } from "@/services/auth-service";
import { AuthError } from "@/services/types/response/auth";
import { ROLE_HOME, ROLE_ICONS, ROLE_LABELS } from "@/helpers/user-role";
import { PASSWORD_RULES, PASSWORD_STRENGTH } from "./-constants/password-rules";

// Invite emails land here. The invite link signs the person in, and this
// page calls supabase.auth.updateUser({ password }).
export const Route = createFileRoute("/_auth/set-password/")({
  beforeLoad: async ({context})=> {
    await context.session.ready()
  },
  component: SetPasswordPage,
});

function SetPasswordPage() {
    const user = useCurrentUser();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passed = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  const strength = PASSWORD_STRENGTH[passed]!;
  const mismatch = confirm.length > 0 && confirm !== password;

  if(!user) return <ExpiredLink/>

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (passed < PASSWORD_RULES.length || confirm !== password) return;
    setSaving(true);
    setError(null)
    try {
      await savePassword(password);
      setDone(true);
    } catch (err) {
            setError(err instanceof AuthError ? err.message : "We couldn't save your password. Please try again.");
    } finally {
      setSaving(false);
    }
  
  };

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
          <Check className="size-7" strokeWidth={3} aria-hidden />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">You're all set</h1>
        <p className="mt-2 text-sm text-slate-500">Your password is saved. Next time, sign in with your email and this password.</p>
        <Link to={ROLE_HOME[user.role]} className={cn(buttonStyles({ size: "lg" }), "mt-8 w-full")}>
          Go to your dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <Badge tone="brand" size="md" icon={ROLE_ICONS[user.role]}>
        Invited as {ROLE_LABELS[user.role]}
      </Badge>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">Welcome to Waitless, {user.fullName}</h1>
      <p className="mt-1.5 text-sm text-slate-500">Choose a password to finish setting up your account.</p>

      <form noValidate onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
        <Field label="New password" error={submitted && passed < PASSWORD_RULES.length ? "Your password doesn't meet all the requirements yet." : undefined}>
          {(a11y) => <Input {...a11y} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>

        <div aria-live="polite">
          <div className="flex gap-1.5" aria-hidden>
            {PASSWORD_RULES.map((_, i) => (
              <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i < passed ? strength.bar : "bg-slate-100")} />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Strength: <span className="font-medium text-slate-700">{password ? strength.label : "Not set"}</span>
          </p>
          <ul className="mt-3 space-y-1.5">
            {PASSWORD_RULES.map((rule) => {
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
            {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={saving}>
          Save password
        </Button>
      </form>
    </>
  );
}


function ExpiredLink() {
  return (
    <div className="text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <Link2Off className="size-7" aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">This link has expired</h1>
      <p className="mt-2 text-sm text-slate-500">
        Invite links work once and expire after a day. Ask your clinic admin to resend your invite.
      </p>
      <Link to="/login" className={cn(buttonStyles({ variant: "secondary", size: "lg" }), "mt-8 w-full")}>
        Back to sign in
      </Link>
    </div>
  );
}
