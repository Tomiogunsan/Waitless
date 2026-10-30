import { bookAppointment, cancelPublicAppointment, getAvailableSlots, getDepartments, getPublicAppointment, reschedulePublicAppointment } from "@/services/booking-service";
import type { ChangeBookingInput } from "@/services/types/interfaces/booking-interface";
import type { BookAppointmentInput, PublicAppointment } from "@/types/booking";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const bookingKeys = {
  all: ["booking"] as const,
  departments: () => [...bookingKeys.all, "departments"] as const,
  slots: () => [...bookingKeys.all, "slots"] as const,
  slotsFor: (departmentId: string, date: string) => [...bookingKeys.slots(), departmentId, date] as const,
  appointment: (reference: string) => [...bookingKeys.all, "appointment", reference] as const,
};

export function useDepartments() {
  return useQuery({
    queryKey: bookingKeys.departments(),
    queryFn: getDepartments,
    staleTime: 60 * 60_000
  });
}

export function useAvailableSlots(departmentId: string | undefined, date: string | null) {
  return useQuery({
    queryKey: bookingKeys.slotsFor(departmentId ?? "", date ?? ""),
    queryFn: () => getAvailableSlots(departmentId!, date!),
    enabled: Boolean(departmentId && date),
  });
}

export function useBookAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BookAppointmentInput) => {
      const confirmation = await bookAppointment(input);
      return getPublicAppointment(confirmation.reference, input.phone);
    },
    onSuccess: (appointment) => {
      if (appointment) queryClient.setQueryData(bookingKeys.appointment(appointment.reference), appointment);
      // The slot just taken must show as taken.
      void queryClient.invalidateQueries({ queryKey: bookingKeys.slots() });
    },
  });
}

export function useFindAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reference, phone }: { reference: string; phone: string }) =>
      getPublicAppointment(reference, phone),
    onSuccess: (appointment) => {
      if (appointment) queryClient.setQueryData(bookingKeys.appointment(appointment.reference), appointment);
    },
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reference, phone, newSlotAt }: ChangeBookingInput & { newSlotAt: string }) => {
      await reschedulePublicAppointment(reference, phone, newSlotAt);
      return getPublicAppointment(reference, phone);
    },
    onSuccess: (appointment) => afterChange(queryClient, appointment),
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reference, phone, reason }: ChangeBookingInput & { reason?: string }) => {
      await cancelPublicAppointment(reference, phone, reason);
      return getPublicAppointment(reference, phone);
    },
    onSuccess: (appointment) => afterChange(queryClient, appointment),
  });
}

// A reschedule or cancel frees one slot and may take another.
function afterChange(queryClient: ReturnType<typeof useQueryClient>, appointment: PublicAppointment | null) {
  if (appointment) queryClient.setQueryData(bookingKeys.appointment(appointment.reference), appointment);
  void queryClient.invalidateQueries({ queryKey: bookingKeys.slots() });
}