import type { AppointmentStatus } from "./clinic";

export interface Department {
  id: string;
  name: string;
}

export interface Slot {
  slotAt: string;
  isAvailable: boolean;
}

export interface BookAppointmentInput {
  departmentId: string;
  slotAt: string;
  fullName: string;
  phone: string;
  email?: string;
}

export interface BookingConfirmation {
  reference: string;
  appointmentTime: string;
  departmentName: string;
}

export interface PublicAppointment {
  reference: string;
  appointmentTime: string;
  status: AppointmentStatus;
  departmentName: string;
  physicianName: string;
  timeUnderReview: boolean;
}
