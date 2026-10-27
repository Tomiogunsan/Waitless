import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import type { IAvatarProp, IAvatarSize } from "./interface";

// Blue-family tints so avatars stay on brand while remaining distinguishable.
const TINTS = [
  "bg-brand-100 text-brand-800",
  "bg-sky-100 text-sky-800",
  "bg-indigo-100 text-indigo-800",
  "bg-cyan-100 text-cyan-800",
  "bg-blue-200/70 text-blue-900",
];

function tintFor(name: string) {
  let sum = 0;
  for (const char of name) sum += char.charCodeAt(0);
  return TINTS[sum % TINTS.length];
}

const SIZES: Record<IAvatarSize, string> = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
};

export default function Avatar({ name, size = "sm", className }: IAvatarProp) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        tintFor(name),
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
