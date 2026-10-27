import type * as Menu from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";

export type IDropdownMenuContentProp = ComponentProps<typeof Menu.Content>;

export type IDropdownMenuItemProp = ComponentProps<typeof Menu.Item> & {
  /** "danger" styles destructive actions in red. */
  tone?: "default" | "danger";
};

export type IDropdownMenuLabelProp = ComponentProps<typeof Menu.Label>;

export type IDropdownMenuSeparatorProp = ComponentProps<typeof Menu.Separator>;
