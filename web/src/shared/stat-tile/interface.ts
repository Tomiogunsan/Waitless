import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type IStatTileDelta = {
  /** Signed change against the previous period, e.g. +12 or -3.4. */
  value: number;
  label: string;
  format?: (_value: number) => string;
  /** False for metrics where lower is better, like wait time or no-shows. */
  upIsGood?: boolean;
};

export type IStatTileProp = {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  delta?: IStatTileDelta;
  /** Shown under the value when there's no delta. */
  hint?: ReactNode;
  className?: string;
};
