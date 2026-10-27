import type { ReactNode } from "react";

export type IPageHeaderProp = {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons on the right, e.g. "Invite staff". */
  actions?: ReactNode;
  /** Small element above the title, e.g. the live indicator. */
  eyebrow?: ReactNode;
};
