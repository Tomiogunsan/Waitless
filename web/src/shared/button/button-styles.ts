import { cn } from "@/lib/cn";
import type { IButtonSize, IButtonStyleProp, IButtonVariant } from "./interface";

const VARIANTS: Record<IButtonVariant, string> = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300",
  secondary:
    "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 shadow-sm hover:bg-slate-50 hover:text-slate-900 disabled:text-slate-400",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:text-brand-300",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-400",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:bg-red-300",
  "danger-soft": "bg-red-50 text-red-700 hover:bg-red-100",
};

const SIZES: Record<IButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-sm",
  md: "h-10 gap-2 rounded-lg px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-6 text-base",
  icon: "size-9 rounded-lg",
};

/**
 * Button classes, so links and other elements can look like buttons:
 * <Link to="/" className={buttonStyles({ variant: "secondary" })}>
 */
export function buttonStyles({ variant = "primary", size = "md", fullWidth = false }: IButtonStyleProp = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors select-none disabled:cursor-not-allowed [&_svg]:size-4 [&_svg]:shrink-0",
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
  );
}
