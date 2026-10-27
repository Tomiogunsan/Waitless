import { cn } from "@/lib/cn";
import type { IBadgeProp, IBadgeSize, IBadgeTone, IBadgeVariant } from "./interface";

const STYLES: Record<IBadgeVariant, Record<IBadgeTone, string>> = {
  soft: {
    neutral: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
    brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    warning: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
    danger: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
    violet: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
  },
  solid: {
    neutral: "bg-slate-700 text-white",
    brand: "bg-brand-600 text-white",
    success: "bg-emerald-600 text-white",
    // Dark text: white on amber falls below readable contrast.
    warning: "bg-amber-400 text-amber-950",
    danger: "bg-red-600 text-white",
    violet: "bg-violet-600 text-white",
  },
  outline: {
    neutral: "bg-white text-slate-700 ring-1 ring-inset ring-slate-300",
    brand: "bg-white text-brand-700 ring-1 ring-inset ring-brand-300",
    success: "bg-white text-emerald-700 ring-1 ring-inset ring-emerald-300",
    warning: "bg-white text-amber-800 ring-1 ring-inset ring-amber-300",
    danger: "bg-white text-red-700 ring-1 ring-inset ring-red-300",
    violet: "bg-white text-violet-700 ring-1 ring-inset ring-violet-300",
  },
};

const DOTS: Record<IBadgeTone, string> = {
  neutral: "bg-slate-400",
  brand: "bg-brand-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  violet: "bg-violet-500",
};

const SIZES: Record<IBadgeSize, string> = {
  sm: "gap-1 px-2 py-0.5 text-xs [&_svg]:size-3",
  md: "gap-1.5 px-2.5 py-1 text-xs [&_svg]:size-3.5",
};


export default function Badge({
  tone = "neutral",
  variant = "soft",
  size = "sm",
  icon: Icon,
  dot = false,
  className,
  children,
  ...props
}: IBadgeProp) {
  // On a filled badge the dot would vanish into the background, so it uses the text colour.
  const dotColor = variant === "solid" ? "bg-current" : DOTS[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        STYLES[variant][tone],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex size-1.5 shrink-0" aria-hidden>
          {dot === "pulse" && (
            <span className={cn("absolute inline-flex size-full animate-pulse-ring rounded-full", dotColor)} />
          )}
          <span className={cn("relative inline-flex size-1.5 rounded-full", dotColor)} />
        </span>
      )}
      {Icon && <Icon aria-hidden />}
      {children}
    </span>
  );
}
