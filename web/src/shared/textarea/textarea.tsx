import { cn } from "@/utils/cn";
import { controlStyles } from "@/shared/form-field/control-styles";
import type { ITextareaProp } from "./interface";

export default function Textarea({ className, ...props }: ITextareaProp) {
  return <textarea className={cn(controlStyles, "min-h-24 resize-y py-2.5 leading-relaxed", className)} {...props} />;
}
