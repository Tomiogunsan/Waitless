import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

export type IBadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "violet";

/** soft: tinted background (default) · solid: filled · outline: white with a coloured border */
export type IBadgeVariant = "soft" | "solid" | "outline";

export type IBadgeSize = "sm" | "md";

export type IBadgeProp = ComponentProps<"span"> & {
  tone?: IBadgeTone;
  variant?: IBadgeVariant;
  size?: IBadgeSize;
  /** Icon shown before the label. Pair it with the label so meaning never relies on colour alone. */
  icon?: LucideIcon;
  /** A small status dot before the label; "pulse" animates it, e.g. for live data. */
  dot?: boolean | "pulse";
};
