import type { AppointmentStatus } from "@/types/clinic";

export const STATUSES: AppointmentStatus[] = ["scheduled", "checked_in", "in_progress", "completed", "cancelled", "no_show"];


export type ChangeBookingInput = {
  reference: string;
  phone: string;
}