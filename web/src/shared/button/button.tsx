import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { buttonStyles } from "./button-styles";
import type { IButtonProp } from "./interface";

export default function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  disabled,
  type = "button",
  className,
  children,
  ...props
}: IButtonProp) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonStyles({ variant, size, fullWidth }), className)}
      {...props}
    >
      {/* The spinner takes the left icon's place so the label doesn't shift. */}
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : LeftIcon && <LeftIcon aria-hidden />}
      {children}
      {RightIcon && !loading && <RightIcon aria-hidden />}
    </button>
  );
}
