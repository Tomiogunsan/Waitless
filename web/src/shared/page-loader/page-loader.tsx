import type { IPageLoaderProp } from "./interface";

/**
 * Full-screen loader shown while the app starts, e.g. on reload while
 * Supabase restores the saved login. Matches the splash in index.html so
 * the hand-over from HTML to React is seamless.
 */
export default function PageLoader({ label = "Loading Waitless" }: IPageLoaderProp) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-white">
      <span className="relative flex size-16 items-center justify-center">
        <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-[1.25rem] bg-brand-400/30 motion-reduce:hidden" />
        <svg viewBox="0 0 32 32" className="relative size-16 drop-shadow-lg drop-shadow-brand-600/25" aria-hidden>
          <rect width="32" height="32" rx="9" className="fill-brand-600" />
          <path
            d="M8 11.5 11.5 21l4.5-7.5 4.5 7.5L24 11.5"
            pathLength={1}
            strokeDasharray="1 1"
            fill="none"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-draw-w stroke-white motion-reduce:animate-none"
          />
        </svg>
      </span>
      <span aria-hidden className="text-lg font-semibold tracking-tight text-slate-900">
        Waitless
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
