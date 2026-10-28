import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import Button from "@/shared/button/button";
import Field from "@/shared/form-field/form-field";
import Input from "@/shared/input/input";
import Alert from "@/shared/alert/alert";
import { isValidEmail } from "@/utils/format";
import {  session } from "@/utils/session";
import { staff } from "@/mocks/clinic";
import type { StaffRole } from "@/types/clinic";
import { ROLE_HOME } from "@/helpers/user-role";

export const Route = createFileRoute("/_auth/login/")({
  beforeLoad: ({ context }) => {
    const role = context.session.getRole();
    if (role) throw redirect({ to: ROLE_HOME[role] });
  },
  component: LoginPage,
});

const DEMO_ROLES: {
  role: StaffRole;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    role: "front_desk",
    title: "Front desk",
    description: "Live schedule, check-ins, patients",
    icon: ClipboardList,
  },
  {
    role: "physician",
    title: "Physician",
    description: "Patient queue and visit notes",
    icon: Stethoscope,
  },
  {
    role: "admin",
    title: "Admin",
    description: "Analytics and staff management",
    icon: BarChart3,
  },
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const enterAs = (role: StaffRole) => {
    session.signIn(role);
    void navigate({ to: ROLE_HOME[role] });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(email) || !password) {
      setError("Enter your email address and password.");
      return;
    }
    setLoading(true);
    setError(null);
    window.setTimeout(() => {
      setLoading(false);
      const member = staff.find((s) => s.email === email.trim().toLowerCase());
      if (!member)
        return setError("That email and password don't match an account.");
      if (!member.is_active)
        return setError(
          "This account has been deactivated. Contact your clinic admin.",
        );
      enterAs(member.role);
    }, 600);
  };

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Staff sign in
      </h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Welcome back. Sign in to see today's clinic.
      </p>

      <form noValidate onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Field label="Email">
          {(a11y) => (
            <Input
              {...a11y}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@waitless.health"
            />
          )}
        </Field>
        <Field label="Password">
          {(a11y) => (
            <div className="relative">
              <Input
                {...a11y}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          )}
        </Field>
        <div className="flex justify-end">
          <button
            type="button"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
            onClick={() =>
              toast.info(
                "Ask a clinic admin to resend your invite to reset your password.",
              )
            }
          >
            Forgot password?
          </button>
        </div>
        {error && <Alert tone="danger" icon={AlertTriangle} title={error} />}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>

      <div className="my-8 flex items-center gap-3 text-xs font-medium tracking-wide text-slate-400 uppercase">
        <span className="h-px flex-1 bg-slate-200" />
        Or explore the demo as
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <ul className="space-y-2">
        {DEMO_ROLES.map(({ role, title, description, icon: Icon }) => (
          <li key={role}>
            <button
              type="button"
              onClick={() => enterAs(role)}
              className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-all hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-sm"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-slate-900">
                  {title}
                </span>
                <span className="block text-xs text-slate-500">
                  {description}
                </span>
              </span>
              <ChevronRight
                className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
