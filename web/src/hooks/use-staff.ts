import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeStaffRole,
  getActiveAppointmentCounts,
  getStaffDirectory,
  inviteStaff,
  physicianHasHistory,
  reassignPhysicianAppointments,
  resendInvite,
  setStaffActive,
} from "@/services/staff-service";
import type { ChangeRoleInput, InviteStaffInput } from "@/types/staff";
import { appointmentKeys } from "./use-appointments";
import { bookingKeys } from "./use-booking";

export const staffKeys = {
  all: ["staff"] as const,
  directory: () => [...staffKeys.all, "directory"] as const,
  activeCounts: () => [...staffKeys.all, "active-counts"] as const,
  history: (physicianId: string) => [...staffKeys.all, "history", physicianId] as const,
};

export function useStaffDirectory() {
  return useQuery({
    queryKey: staffKeys.directory(),
    queryFn: getStaffDirectory,
  });
}

export function useActiveAppointmentCounts() {
  return useQuery({
    queryKey: staffKeys.activeCounts(),
    queryFn: getActiveAppointmentCounts,
  });
}

export function usePhysicianHasHistory(physicianId: string | undefined) {
  return useQuery({
    queryKey: staffKeys.history(physicianId ?? ""),
    queryFn: () => physicianHasHistory(physicianId!),
    enabled: Boolean(physicianId),
  });
}

export function useInviteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteStaffInput) => inviteStaff(input),
    onSuccess: () => afterChange(queryClient),
  });
}

export function useResendInvite() {
  return useMutation({
    mutationFn: (staffId: string) => resendInvite(staffId),
  });
}

export function useSetStaffActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ staffId, active }: { staffId: string; active: boolean }) =>
      setStaffActive(staffId, active),
    onSuccess: () => afterChange(queryClient),
  });
}

export function useChangeStaffRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeRoleInput) => changeStaffRole(input),
    onSuccess: () => afterChange(queryClient),
  });
}

export function useReassignPhysicianAppointments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (physicianId: string) => reassignPhysicianAppointments(physicianId),
    onSuccess: () => afterChange(queryClient),
  });
}

// Staff changes alter who can be booked and who holds which appointments.
function afterChange(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: staffKeys.all });
  void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
  void queryClient.invalidateQueries({ queryKey: bookingKeys.slots() });
}
