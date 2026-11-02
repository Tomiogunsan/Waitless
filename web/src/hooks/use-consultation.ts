import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeConsultation,
  getMedicalInfo,
  getVisitHistory,
  getVisitNote,
  saveVisitNote,
  startConsultation,
} from "@/services/consultation-service";
import type { SaveVisitNoteInput } from "@/types/consultation";
import { appointmentKeys } from "./use-appointments";
import { bookingKeys } from "./use-booking";

export const consultationKeys = {
  all: ["consultation"] as const,
  medicalInfo: (patientIds: string[]) =>
    [...consultationKeys.all, "medical-info", [...patientIds].sort().join(",")] as const,
  note: (appointmentId: string) => [...consultationKeys.all, "note", appointmentId] as const,
  history: (patientId: string) => [...consultationKeys.all, "history", patientId] as const,
};


export function useMedicalInfo(patientIds: string[]) {
  return useQuery({
    queryKey: consultationKeys.medicalInfo(patientIds),
    queryFn: () => getMedicalInfo(patientIds),
    enabled: patientIds.length > 0,
  });
}

export function useVisitNote(appointmentId: string) {
  return useQuery({
    queryKey: consultationKeys.note(appointmentId),
    queryFn: () => getVisitNote(appointmentId),
  });
}

export function useVisitHistory(patientId: string | undefined) {
  return useQuery({
    queryKey: consultationKeys.history(patientId ?? ""),
    queryFn: () => getVisitHistory(patientId!),
    enabled: Boolean(patientId),
  });
}

export function useStartConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => startConsultation(appointmentId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}

export function useSaveVisitNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveVisitNoteInput) => saveVisitNote(input),
    onSuccess: (_noteId, input) =>
      void queryClient.invalidateQueries({ queryKey: consultationKeys.note(input.appointmentId) }),
  });
}

export function useCompleteConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => completeConsultation(appointmentId),
    // Completing can move the physician's later appointments, and the
    // finished visit joins the patient's history.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: consultationKeys.all });
      void queryClient.invalidateQueries({ queryKey: bookingKeys.slots() });
    },
  });
}
