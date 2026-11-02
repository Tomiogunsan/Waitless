import type { AppointmentStatus } from "@/types/clinic";
import { BookingError, GENERIC_ERROR_MESSAGE } from "../../error";

export const STATUSES: AppointmentStatus[] = ["scheduled", "checked_in", "in_progress", "completed", "cancelled", "no_show"];

export function toStatus(value: string): AppointmentStatus {
  if (STATUSES.includes(value as AppointmentStatus)) return value as AppointmentStatus;
  throw new BookingError(GENERIC_ERROR_MESSAGE);
}

export type ChangeBookingInput = {
  reference: string;
  phone: string;
}
