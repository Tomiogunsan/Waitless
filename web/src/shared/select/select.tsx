import { cn } from "@/lib/cn";
import { controlStyles } from "@/shared/form-field/control-styles";
import type { ISelectProp } from "./interface";

/** Native select with the app's styling and a chevron, so it stays accessible on mobile. */
export default function Select({ className, ...props }: ISelectProp) {
  return (
    <select
      className={cn(
        controlStyles,
        "h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2364748b%22><path d=%22M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z%22/></svg>')] bg-[length:1.1rem] bg-[right_0.6rem_center] bg-no-repeat pr-9",
        className,
      )}
      {...props}
    />
  );
}
