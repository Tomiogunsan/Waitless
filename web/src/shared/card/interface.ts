import type { ComponentProps, ReactNode } from "react";

export type ICardProp = ComponentProps<"section">;

export type ICardHeaderProp = Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons or controls on the right of the header. */
  actions?: ReactNode;
};

export type ICardBodyProp = ComponentProps<"div">;
