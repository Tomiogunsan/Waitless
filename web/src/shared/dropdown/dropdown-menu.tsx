import * as Menu from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({ className, align = "end", sideOffset = 6, ...props }: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-pop data-[state=open]:animate-fade-in",
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

interface ItemProps extends ComponentProps<typeof Menu.Item> {
  tone?: "default" | "danger";
}

export function DropdownMenuItem({ className, tone = "default", ...props }: ItemProps) {
  return (
    <Menu.Item
      className={cn(
        "flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
        tone === "danger"
          ? "text-red-600 data-[highlighted]:bg-red-50"
          : "text-slate-700 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 [&_svg]:text-slate-400",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn("px-2.5 pt-1.5 pb-1 text-xs font-medium text-slate-400", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn("my-1.5 h-px bg-slate-100", className)} {...props} />;
}
