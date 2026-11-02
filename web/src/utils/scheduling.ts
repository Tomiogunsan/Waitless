import type { BookedTime } from "@/types/appointment";
import type { Slot } from "@/types/booking";
import type { AppointmentStatus } from "@/types/clinic";
import { APPOINTMENT_MINUTES, SLOT_TIMES, atClinicTime, clinicToday } from "./time";

export const ACTIVE_STATUSES: AppointmentStatus[] = ["scheduled", "checked_in", "in_progress"];

const BLOCK_MS = APPOINTMENT_MINUTES * 60_000;

export function isActive(appointment: { status: AppointmentStatus }): boolean {
  return ACTIVE_STATUSES.includes(appointment.status);
}

export function isOnDate(iso: string, date: string): boolean {
  return clinicToday(new Date(iso)) === date;
}

/** Same overlap rule as the exclusion constraints: half-open 40-minute blocks. */
export function overlaps(a: string, b: string): boolean {
  const start = new Date(a).getTime();
  const other = new Date(b).getTime();
  return start < other + BLOCK_MS && other < start + BLOCK_MS;
}


export function isSlotFree(appointments: BookedTime[], slotAt: string, excludeAppointmentId?: string): boolean {
  return !appointments.some(
    (a) => a.id !== excludeAppointmentId && isActive(a) && overlaps(a.scheduledAt, slotAt),
  );
}


export function openSlots(appointments: BookedTime[], date: string, now: Date, excludeAppointmentId?: string): Slot[] {
  const earliest = now.getTime() + 60 * 60_000;
  return SLOT_TIMES.map((time) => {
    const slotAt = atClinicTime(date, time).toISOString();
    return {
      slotAt,
      isAvailable: new Date(slotAt).getTime() >= earliest && isSlotFree(appointments, slotAt, excludeAppointmentId),
    };
  });
}