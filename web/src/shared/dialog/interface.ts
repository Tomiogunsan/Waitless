import type * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ComponentProps, ReactNode } from "react";

export type IDialogSize = "sm" | "md" | "lg";

export type IDialogContentProp = Omit<ComponentProps<typeof DialogPrimitive.Content>, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  size?: IDialogSize;
};

export type IDialogFooterProp = ComponentProps<"div">;
