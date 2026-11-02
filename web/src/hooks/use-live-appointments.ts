import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { subscribeToAppointmentChanges } from "@/services/realtime-service";
import { appointmentKeys } from "./use-appointments";
import { bookingKeys } from "./use-booking";
import { consultationKeys } from "./use-consultation";
import { patientKeys } from "./use-patients";
import { staffKeys } from "./use-staff";

// One change (e.g. a late consultation moving a doctor's whole afternoon)
// can arrive as many events; wait briefly and refresh once.
const BATCH_MS = 300;

export function useLiveAppointments(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
        void queryClient.invalidateQueries({ queryKey: consultationKeys.all });
        void queryClient.invalidateQueries({ queryKey: patientKeys.all });
        void queryClient.invalidateQueries({ queryKey: staffKeys.activeCounts() });
        void queryClient.invalidateQueries({ queryKey: bookingKeys.slots() });
      }, BATCH_MS);
    };
    const unsubscribe = subscribeToAppointmentChanges(refresh);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [enabled, queryClient]);
}
