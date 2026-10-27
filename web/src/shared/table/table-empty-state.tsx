import { AlertTriangle, Inbox, SearchX, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import EmptyState from "@/shared/empty-state/empty-state";
import { cn } from "@/utils/cn";

export type TableEmptyStateVariant = "empty" | "no-results" | "error";

// Sensible copy for each situation, so most tables need no props at all.
const PRESETS: Record<TableEmptyStateVariant, { icon: LucideIcon; title: string; description: string }> = {
  empty: {
    icon: Inbox,
    title: "Nothing here yet",
    description: "Records will appear here once they're added.",
  },
  "no-results": {
    icon: SearchX,
    title: "No results found",
    description: "Try a different search term or clear your filters.",
  },
  error: {
    icon: AlertTriangle,
    title: "Couldn't load this data",
    description: "Check your connection and try again.",
  },
};

export interface TableEmptyStateProps {
  /** Picks the default icon and copy. */
  variant?: TableEmptyStateVariant;
  icon?: LucideIcon;
  title?: string;
  description?: ReactNode;
  /** A button or link, e.g. "Add patient" or "Clear filters". */
  action?: ReactNode;
  /** "sm" suits tables inside cards or dialogs. */
  size?: "sm" | "md";
  className?: string;
}


export default function TableEmptyState({
  variant = "empty",
  icon,
  title,
  description,
  action,
  size = "md",
  className,
}: TableEmptyStateProps) {
  const preset = PRESETS[variant];

  return (

    <div role="status" aria-live="polite">
      <EmptyState
        icon={icon ?? preset.icon}
        title={title ?? preset.title}
        description={description ?? preset.description}
        action={action}
        className={cn(size === "sm" && "py-8", variant === "error" && "[&>span]:bg-red-50 [&>span]:text-red-600", className)}
      />
    </div>
  );
}
