import { PlayCircle } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import Button from "@/shared/button/button";
import { Card } from "@/shared/card/card";
import { usePhysicianDay } from "@/hooks/use-appointments";
import { useStartConsultation } from "@/hooks/use-consultation";
import { useNow } from "@/hooks/use-now";
import type { StaffAppointment } from "@/types/appointment";
import { useCurrentUser } from "@/utils/session";
import { clinicToday, formatDuration, minutesBetween } from "@/utils/time";

export function StartPanel({ appointment }: { appointment: StaffAppointment }) {
  const me = useCurrentUser()!;
  const now = useNow();
  const date = useMemo(() => clinicToday(), []);
  const { data: mine = [] } = usePhysicianDay(me.id, date);
  const { mutate: start, isPending } = useStartConsultation();
  const busy = mine.some((a) => a.status === "in_progress");

  return (
    <Card className="p-8 text-center">
      <PlayCircle className="mx-auto size-10 text-brand-600" aria-hidden />
      <h2 className="mt-3 text-lg font-semibold text-slate-900">
        Ready when you are
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {appointment.patient.fullName} has been waiting{" "}
        {formatDuration(minutesBetween(appointment.checkedInAt!, now))}.
      </p>
      <Button
        className="mt-6"
        disabled={busy}
        loading={isPending}
        onClick={() =>
          start(appointment.id, {
            onError: (err) => toast.error(err.message),
          })
        }
      >
        Start consultation
      </Button>
      {busy && (
        <p className="mt-2 text-xs text-slate-500">
          Complete your current consultation first.
        </p>
      )}
    </Card>
  );
}
