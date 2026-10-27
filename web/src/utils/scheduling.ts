import type { Appointment, AppointmentStatus, Slot } from "@/types/clinic";
import { APPOINTMENT_MINUTES, SLOT_TIMES, atClinicTime, clinicToday } from "./time";

export const ACTIVE_STATUSES: AppointmentStatus[] = ["scheduled", "checked_in", "in_progress"];

const BLOCK_MS = APPOINTMENT_MINUTES * 60_000;

export function isActive(appointment: Appointment): boolean {
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

/** Mirror of physician_is_available(): free if no active appointment overlaps. */
export function isPhysicianFree(
  appointments: Appointment[],
  physicianId: string,
  slotAt: string,
  excludeAppointmentId?: string,
): boolean {
  return !appointments.some(
    (a) => a.physician_id === physicianId && a.id !== excludeAppointmentId && isActive(a) && overlaps(a.scheduled_at, slotAt),
  );
}

/** A physician's bookable slots on a date, at least an hour from `now`. */
export function physicianSlots(
  appointments: Appointment[],
  physicianId: string,
  date: string,
  now: Date,
  excludeAppointmentId?: string,
): Slot[] {
  const earliest = now.getTime() + 60 * 60_000;
  return SLOT_TIMES.map((time) => {
    const slotAt = atClinicTime(date, time).toISOString();
    return {
      slot_at: slotAt,
      is_available:
        new Date(slotAt).getTime() >= earliest && isPhysicianFree(appointments, physicianId, slotAt, excludeAppointmentId),
    };
  });
}

export function newReferenceCode(): string {
  return `CLN-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}
