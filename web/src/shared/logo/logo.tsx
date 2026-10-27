import { cn } from "@/lib/cn";
import type { ILogoProp } from "./interface";

export default function Logo({ className, inverted = false }: ILogoProp) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="9" className={inverted ? "fill-white" : "fill-brand-600"} />
        <path
          d="M8 11.5 11.5 21l4.5-7.5 4.5 7.5L24 11.5"
          fill="none"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={inverted ? "stroke-brand-600" : "stroke-white"}
        />
      </svg>
      <span className={cn("text-lg", inverted ? "text-white" : "text-slate-900")}>Waitless</span>
    </span>
  );
}
