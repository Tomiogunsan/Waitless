import { cn } from "@/utils/cn";
import { controlStyles } from "@/shared/form-field/control-styles";
import type { IInputProp } from "./interface";

export default function Input({ className, ...props }: IInputProp) {
  return <input className={cn(controlStyles, "h-10", className)} {...props} />;
}
