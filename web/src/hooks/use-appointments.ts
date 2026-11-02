import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bookForPatient, cancelAppointment, checkInAppointment, getAppointment, getDayAppointments,
  getPhysicianDay, getPhysicians, markNoShow, reassignAppointment,
  rescheduleAppointment, searchPatients,
} from "@/services/appointment-service";
import { bookingKeys } from "./use-booking";

export const appointmentKeys = {
  all: ["appointments"] as const,
  day: (date: string) => [...appointmentKeys.all, "day", date] as const,
  detail: (appointmentId: string) => [...appointmentKeys.all, "detail", appointmentId] as const,
  physicianDay: (physicianId: string, date: string) =>
    [...appointmentKeys.all, "physician-day", physicianId, date] as const,
  physicians: () => [...appointmentKeys.all, "physicians"] as const,
  patientSearch: (query: string) => [...appointmentKeys.all, "patient-search", query] as const,
};

export function useDayAppointments(date: string) {
  return useQuery({
    queryKey: appointmentKeys.day(date),
    queryFn: () => getDayAppointments(date),
  });
}


export function useAppointment(appointmentId: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(appointmentId),
    queryFn: () => getAppointment(appointmentId),
  });
}

export function usePhysicianDay(physicianId: string | undefined, date: string | null) {
  return useQuery({
    queryKey: appointmentKeys.physicianDay(physicianId ?? "", date ?? ""),
    queryFn: () => getPhysicianDay(physicianId!, date!),
    enabled: Boolean(physicianId && date),
  });
}

export function usePhysicians() {
  return useQuery({
    queryKey: appointmentKeys.physicians(),
    queryFn: getPhysicians,
    staleTime: 10 * 60_000, 
  });
}

export function usePatientSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: appointmentKeys.patientSearch(q),
    queryFn: () => searchPatients(q),
    enabled: q.length >= 2,
    placeholderData: (previous) => previous, 
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => checkInAppointment(appointmentId),
    onSuccess: () => afterChange(queryClient),
  });
}

export function useMarkNoShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => markNoShow(appointmentId),
    onSuccess: () => afterChange(queryClient),
  });
}

export function useStaffCancel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appointmentId, reason }: { appointmentId: string; reason?: string }) =>
      cancelAppointment(appointmentId, reason),
    onSuccess: () => afterChange(queryClient),
  });
}

export function useStaffReschedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appointmentId, slotAt }: { appointmentId: string; slotAt: string }) =>
      rescheduleAppointment(appointmentId, slotAt),
    onSuccess: () => afterChange(queryClient),
  });
}

/** Leave physicianId out for the first free doctor. Resolves to the new doctor's id. */
export function useReassign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appointmentId, physicianId }: { appointmentId: string; physicianId?: string }) =>
      reassignAppointment(appointmentId, physicianId),
    onSuccess: () => afterChange(queryClient),
  });
}

export function useBookForPatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, physicianId, slotAt }: { patientId: string; physicianId: string; slotAt: string }) =>
      bookForPatient(patientId, physicianId, slotAt),
    onSuccess: () => afterChange(queryClient),
  });
}

// Any change can free one slot and take another, on this screen and on the
// public booking page, so refresh both.
function afterChange(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
  void queryClient.invalidateQueries({ queryKey: bookingKeys.slots() });
}
