import type { AppointmentStatus } from "./clinic";

export interface StaffAppointment {
  id: string;
  reference: string;
  scheduledAt: string;
  originalScheduledAt: string;
  status: AppointmentStatus;
  checkedInAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  needsReview: boolean;
  patient: { id: string; fullName: string; phone: string; email: string | null };
  physician: { id: string; fullName: string };
  department: { id: string; name: string };
}


export type BookedTime = Pick<StaffAppointment, "id" | "status" | "scheduledAt">;

export interface Physician {
  id: string;
  fullName: string;
  departmentId: string;
}

export interface PatientSummary {
  id: string;
  fullName: string;
  phone: string;
}
