import {
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Stethoscope,
  UserCheck,
  UserX,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { AppointmentStatus } from "@/types/clinic";
import Badge from "@/shared/badge/badge";
import type { IBadgeTone } from "@/shared/badge/interface";

const STATUS_META: Record<AppointmentStatus, { label: string; tone: IBadgeTone; icon: LucideIcon }> = {
  scheduled: { label: "Scheduled", tone: "neutral", icon: CalendarClock },
  checked_in: { label: "Waiting", tone: "brand", icon: UserCheck },
  in_progress: { label: "With doctor", tone: "violet", icon: Stethoscope },
  completed: { label: "Completed", tone: "success", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", tone: "neutral", icon: XCircle },
  no_show: { label: "No-show", tone: "danger", icon: UserX },
};

/** Status is always shown as icon + label, never colour alone. */
export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const meta = STATUS_META[status] ?? { label: status, tone: "neutral", icon: CircleDashed };
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}
