import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPatientAppointments } from "@/services/appointment-service";
import {
  findPatientByPhone,
  getPatient,
  getPatientDirectory,
  registerPatient,
  updatePatientContact,
} from "@/services/patient-service";
import type { PatientContactInput } from "@/types/patient";
import { appointmentKeys } from "./use-appointments";

export const patientKeys = {
  all: ["patients"] as const,
  directory: (query: string, page: number, pageSize: number) =>
    [...patientKeys.all, "directory", query, page, pageSize] as const,
  detail: (patientId: string) => [...patientKeys.all, "detail", patientId] as const,
  byPhone: (phone: string) => [...patientKeys.all, "by-phone", phone] as const,
  appointments: (patientId: string) => [...patientKeys.all, "appointments", patientId] as const,
};

export function usePatientDirectory(query: string, page: number, pageSize: number) {
  const q = query.trim();
  return useQuery({
    queryKey: patientKeys.directory(q, page, pageSize),
    queryFn: () => getPatientDirectory(q, page, pageSize),
    placeholderData: (previous) => previous,
  });
}

export function usePatient(patientId: string) {
  return useQuery({
    queryKey: patientKeys.detail(patientId),
    queryFn: () => getPatient(patientId),
  });
}

export function usePatientByPhone(phone: string | null) {
  return useQuery({
    queryKey: patientKeys.byPhone(phone ?? ""),
    queryFn: () => findPatientByPhone(phone!),
    enabled: Boolean(phone),
  });
}

export function usePatientAppointments(patientId: string) {
  return useQuery({
    queryKey: patientKeys.appointments(patientId),
    queryFn: () => getPatientAppointments(patientId),
  });
}

export function useRegisterPatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PatientContactInput) => registerPatient(input),
    onSuccess: () => afterChange(queryClient),
  });
}

export function useUpdatePatientContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, input }: { patientId: string; input: PatientContactInput }) =>
      updatePatientContact(patientId, input),
    onSuccess: () => afterChange(queryClient),
  });
}

// Names and phones also show on the front desk list and its patient search.
function afterChange(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: patientKeys.all });
  void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
}
