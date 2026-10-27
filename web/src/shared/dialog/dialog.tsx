import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";
import type { IDialogContentProp, IDialogFooterProp, IDialogSize } from "./interface";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const WIDTHS: Record<IDialogSize, string> = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

export function DialogContent({ title, description, size = "md", className, children, ...props }: IDialogContentProp) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white shadow-pop focus:outline-none data-[state=open]:animate-scale-in",
          WIDTHS[size],
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 pt-5 pb-4">
          <div>
            <DialogPrimitive.Title className="text-lg font-semibold text-slate-900">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm text-slate-500">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="-mt-1 -mr-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogFooter({ className, ...props }: IDialogFooterProp) {
  return (
    <div
      className={cn("-mx-6 -mb-5 mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}
