import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Info, LogIn } from "lucide-react";
import { buttonStyles } from "@/shared/button/button-styles";
import Logo from "@/shared/logo/logo";
import { cn } from "@/utils/cn";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

const navLink =
  "rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900";

function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="bg-brand-950 px-4 py-2 text-center text-xs text-brand-100">
        <Info className="mr-1.5 inline size-3.5 align-[-2px]" aria-hidden />
        Portfolio demo. Please use made-up details; no real clinic receives these bookings.
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="Waitless home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1">
            <Link to="/" className={cn(navLink, "hidden sm:block")} activeProps={{ className: "text-brand-700" }} activeOptions={{ exact: true }}>
              Book appointment
            </Link>
            <Link to="/manage" className={navLink} activeProps={{ className: "text-brand-700" }}>
              Manage booking
            </Link>
            <Link to="/login" className={cn(buttonStyles({ variant: "secondary", size: "sm" }), "ml-2")}>
              <LogIn aria-hidden />
              <span className="hidden sm:inline">Staff sign in</span>
              <span className="sm:hidden">Staff</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200/70 bg-slate-50/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo className="[&_span]:text-base [&_svg]:size-6" />
          <p>Open Monday – Friday, 08:40 – 17:00 · Lunch 12:00 – 13:00 (Lagos time)</p>
        </div>
      </footer>
    </div>
  );
}
