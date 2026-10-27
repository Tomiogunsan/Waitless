import type { ReactNode } from "react";

/** Props the Field passes to its control so label, hint and error are announced together. */
export type IFieldControlProps = {
  id: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
};

export type IFieldProp = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  className?: string;
  /** Receives the generated id and the ARIA props to wire up the control. */
  children: (props: IFieldControlProps) => ReactNode;
};
