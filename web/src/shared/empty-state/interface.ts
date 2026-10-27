import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type IEmptyStateProp = {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};
