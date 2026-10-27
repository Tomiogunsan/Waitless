import { cn } from "@/utils/cn";
import type { ICardBodyProp, ICardHeaderProp, ICardProp } from "./interface";

export function Card({ className, ...props }: ICardProp) {
  return (
    <section
      className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-card", className)}
      {...props}
    />
  );
}

export function CardHeader({ title, description, actions, className, ...props }: ICardHeaderProp) {
  return (
    <div
      className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4", className)}
      {...props}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: ICardBodyProp) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}
