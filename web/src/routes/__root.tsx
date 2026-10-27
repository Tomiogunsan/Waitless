import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { Toaster } from "sonner";
import { buttonStyles } from "@/shared/button/button-styles";
import Logo from "@/shared/logo/logo";
import { cn } from "@/utils/cn";
import type { Session } from "@/utils/session";

export interface RouterContext {
  queryClient: QueryClient;
  session: Session;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <Outlet />
      <Toaster position="top-right" richColors closeButton toastOptions={{ className: "font-sans" }} />
    </>
  ),
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-linear-to-b from-brand-50 to-white px-6 text-center">
      <Logo />
      <span className="mt-10 flex size-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-card">
        <Compass className="size-7" aria-hidden />
      </span>
      <p className="mt-6 text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">We couldn't find that page</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The link may be broken, or the page may have moved. Let's get you back on track.
      </p>
      <Link to="/" className={cn(buttonStyles(), "mt-8")}>
        Back to booking
      </Link>
    </main>
  );
}
