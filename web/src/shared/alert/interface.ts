import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type IAlertTone = "info" | "warning" | "danger" | "success";

export type IAlertProp = {
  tone?: IAlertTone;
  icon: LucideIcon;
  title: ReactNode;
  children?: ReactNode;
  /** A button on the right, e.g. "Resolve". */
  action?: ReactNode;
  className?: string;
};
