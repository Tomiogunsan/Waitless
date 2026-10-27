import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  ChevronsUpDown,
  ListOrdered,
  LogOut,
  Menu,
  Repeat2,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import Avatar from "@/shared/avatar/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/dropdown/dropdown-menu";
import Logo from "@/shared/logo/logo";
import { cn } from "@/lib/cn";
import { ROLE_LABELS } from "@/lib/format";
import { ROLE_HOME, session, useRole } from "@/lib/session";
import { CURRENT_USER, getStaff } from "@/mocks/clinic";
import type { StaffRole } from "@/types/clinic";

export const Route = createFileRoute("/_staff")({
  beforeLoad: ({ context }) => {
    if (!context.session.getRole()) throw redirect({ to: "/login" });
  },
  component: StaffLayout,
});

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV: Record<StaffRole, NavItem[]> = {
  front_desk: [
    { to: "/front-desk", label: "Today", icon: CalendarDays },
    { to: "/patients", label: "Patients", icon: Users },
  ],
  physician: [
    { to: "/physician", label: "My queue", icon: ListOrdered },
    { to: "/patients", label: "My patients", icon: Users },
  ],
  admin: [
    { to: "/admin", label: "Analytics", icon: BarChart3, exact: true },
    { to: "/admin/staff", label: "Staff", icon: UserCog },
    { to: "/front-desk", label: "Today's schedule", icon: CalendarDays },
    { to: "/patients", label: "Patients", icon: Users },
  ],
};

function StaffLayout() {
  const role = useRole();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // The menu remembers the page it was opened on, so navigating closes it.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;
  const setMenuOpen = (open: boolean) => setMenuOpenOn(open ? pathname : null);

  if (!role) return null;

  return (
    <div className="min-h-dvh bg-slate-50/70">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/80 bg-white lg:block">
        <Sidebar role={role} />
      </aside>

      <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur lg:hidden">
          <Logo className="[&_span]:text-base [&_svg]:size-7" />
          <DialogPrimitive.Trigger
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </DialogPrimitive.Trigger>
        </header>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-slate-900/40 data-[state=open]:animate-fade-in lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-pop data-[state=open]:animate-slide-in-left focus:outline-none lg:hidden">
            <DialogPrimitive.Title className="sr-only">
              Navigation
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Pages available to your role
            </DialogPrimitive.Description>
            <DialogPrimitive.Close
              className="absolute top-4 right-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
            <Sidebar role={role} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="lg:pl-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Sidebar({ role }: { role: StaffRole }) {
  const navigate = useNavigate();
  const user = getStaff(CURRENT_USER[role])!;

  const switchRole = (next: StaffRole) => {
    session.signIn(next);
    void navigate({ to: ROLE_HOME[next] });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link to={ROLE_HOME[role]} aria-label="Waitless dashboard">
          <Logo />
        </Link>
      </div>

      <nav aria-label="Dashboard" className="flex-1 space-y-1 px-3 py-4">
        <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
          {ROLE_LABELS[role]}
        </p>
        {NAV[role].map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: exact ?? false }}
            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            activeProps={{
              className:
                "bg-brand-50 text-brand-700 hover:bg-brand-50 hover:text-brand-700",
            }}
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    "size-5",
                    isActive
                      ? "text-brand-600"
                      : "text-slate-400 group-hover:text-slate-500",
                  )}
                  aria-hidden
                />
                {label}
              </>
            )}
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-slate-100 data-[state=open]:bg-slate-100">
            <Avatar name={user.full_name} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {user.full_name}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {user.email}
              </span>
            </span>
            <ChevronsUpDown className="size-4 text-slate-400" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-60">
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <Repeat2 className="size-3.5" aria-hidden />
              Demo: switch role
            </DropdownMenuLabel>
            {(Object.keys(ROLE_HOME) as StaffRole[]).map((r) => (
              <DropdownMenuItem
                key={r}
                onSelect={() => switchRole(r)}
                disabled={r === role}
              >
                {ROLE_LABELS[r]}
                {r === role && (
                  <span className="ml-auto text-xs text-slate-400">
                    Current
                  </span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                session.signOut();
                void navigate({ to: "/login" });
              }}
            >
              <LogOut aria-hidden />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
