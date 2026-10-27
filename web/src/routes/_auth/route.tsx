import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Clock, Stethoscope, UserCheck } from "lucide-react";
import Logo from "@/shared/logo/logo";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)] xl:grid-cols-[1fr_640px]">
      <BrandPanel />
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <Link to="/" className="lg:hidden" aria-label="Waitless home">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

const QUEUE = [
  { name: "Kunle Afolabi", time: "10:40", status: "Waiting · 16 min", icon: UserCheck, tone: "bg-brand-500/30 text-white" },
  { name: "Amaka Obi", time: "10:00", status: "With Dr. Nwosu", icon: Stethoscope, tone: "bg-violet-400/30 text-white" },
  { name: "Emeka Nwankwo", time: "11:20", status: "Waiting · 3 min", icon: UserCheck, tone: "bg-brand-500/30 text-white" },
];

/** Decorative product preview shown beside the sign-in form on large screens. */
function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-brand-700 p-12 text-white lg:flex lg:flex-col">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(50rem_30rem_at_100%_0%,var(--color-brand-500),transparent),radial-gradient(40rem_30rem_at_0%_100%,var(--color-brand-950),transparent)]"
      />
      <Link to="/" className="relative" aria-label="Waitless home">
        <Logo inverted />
      </Link>

      <div className="relative my-auto max-w-md">
        <h2 className="text-3xl font-semibold tracking-tight text-balance">Every patient, every doctor, one live view.</h2>
        <p className="mt-3 text-brand-100">
          Check patients in, follow each doctor's queue and keep the day on time, with every change appearing for the
          whole team instantly.
        </p>

        <div aria-hidden className="mt-10 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-md">
          <div className="flex items-center justify-between px-1 pb-3 text-sm">
            <span className="font-medium">Today's queue</span>
            <span className="flex items-center gap-1.5 text-xs text-brand-100">
              <span className="size-1.5 rounded-full bg-emerald-400" /> Live
            </span>
          </div>
          <ul className="space-y-2">
            {QUEUE.map(({ name, time, status, icon: Icon, tone }) => (
              <li key={name} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
                <span className="tabular w-11 text-sm font-medium text-brand-100">{time}</span>
                <span className="flex-1 text-sm font-medium">{name}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${tone}`}>
                  <Icon className="size-3" />
                  {status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="relative flex items-center gap-2 text-sm text-brand-100">
        <Clock className="size-4" aria-hidden />
        Average wait down from 31 to 14 minutes in 3 months.
      </p>
    </aside>
  );
}
