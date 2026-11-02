import type { StaffAppointment } from "@/types/appointment";
import { fail } from "../../error";
import { toStatus } from "./booking-interface";

// appointments links to staff three times (physician, cancelled_by,
// no_show_by), so the physician join must name its foreign key.
export const APPOINTMENT_SELECT = `
  id, reference_code, scheduled_at, original_scheduled_at, status,
  checked_in_at, actual_started_at, actual_ended_at, reschedule_needs_review,
  patient:patients(id, full_name, phone),
  physician:staff!appointments_physician_id_physician_role_fkey(id, full_name),
  department:departments(id, name)
`;

/** One row of APPOINTMENT_SELECT, as the database returns it. */
export interface AppointmentRow {
  id: string;
  reference_code: string;
  scheduled_at: string;
  original_scheduled_at: string;
  status: string;
  checked_in_at: string | null;
  actual_started_at: string | null;
  actual_ended_at: string | null;
  reschedule_needs_review: boolean;
  patient: { id: string; full_name: string; phone: string } | null;
  physician: { id: string; full_name: string } | null;
  department: { id: string; name: string } | null;
}

export function toAppointment(row: AppointmentRow): StaffAppointment {
  if (!row.patient || !row.physician || !row.department) fail(null);
  return {
    id: row.id,
    reference: row.reference_code,
    scheduledAt: row.scheduled_at,
    originalScheduledAt: row.original_scheduled_at,
    status: toStatus(row.status),
    checkedInAt: row.checked_in_at,
    startedAt: row.actual_started_at,
    endedAt: row.actual_ended_at,
    needsReview: row.reschedule_needs_review,
    patient: { id: row.patient.id, fullName: row.patient.full_name, phone: row.patient.phone },
    physician: { id: row.physician.id, fullName: row.physician.full_name },
    department: { id: row.department.id, name: row.department.name },
  };
}
