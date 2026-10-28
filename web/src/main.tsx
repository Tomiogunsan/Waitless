import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import PageLoader from "@/shared/page-loader/page-loader";
import { session } from "@/utils/session";
import { routeTree } from "./routeTree.gen";
import "./index.css";

// Ready for when the API is connected: route loaders will prefetch
// Supabase queries through this client.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

const router = createRouter({
  routeTree,
  context: { queryClient, session },
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Long enough for the logo animation to read as intentional, not a flicker.
const MIN_LOADER_MS = 600;

const root = createRoot(document.getElementById("root")!);

// Show the loader while Supabase restores any saved login, so the first
// screen is the right one (dashboard or sign-in) with no flash in between.
root.render(<PageLoader />);

void Promise.all([session.ready(), new Promise((resolve) => setTimeout(resolve, MIN_LOADER_MS))]).then(() => {
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
});
