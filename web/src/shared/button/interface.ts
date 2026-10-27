import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";


export type IButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger" | "danger-soft";


export type IButtonSize = "sm" | "md" | "lg" | "icon";

export type IButtonStyleProp = {
  variant?: IButtonVariant;
  size?: IButtonSize;
 
  fullWidth?: boolean;
};

export type IButtonProp = ComponentProps<"button"> &
  IButtonStyleProp & {
  
    loading?: boolean;
    leftIcon?: LucideIcon;
    rightIcon?: LucideIcon;
  };
