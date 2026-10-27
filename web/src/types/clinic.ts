// Shapes that mirror the Supabase tables and functions in supabase/migrations.
// Once the API is connected, these can be replaced by the generated types
// from `supabase gen types typescript --local`.

export type StaffRole = "physician" | "front_desk" | "admin";

export type AppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Department {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  department_id: string | null;
  is_active: boolean;
  /** True until the person accepts their email invite. */
  invite_pending: boolean;
  created_at: string;
}

export interface Patient {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at: string;
}

export interface PatientMedicalInfo {
  patient_id: string;
  allergies: string;
  medical_history: string | null;
  updated_at: string;
}

export interface Appointment {
  id: string;
  reference_code: string;
  patient_id: string;
  physician_id: string;
  department_id: string;
  original_scheduled_at: string;
  scheduled_at: string;
  checked_in_at: string | null;
  actual_started_at: string | null;
  actual_ended_at: string | null;
  status: AppointmentStatus;
  cancellation_reason: string | null;
  reschedule_needs_review: boolean;
  reschedule_review_reason: string | null;
}

export interface VisitNote {
  id: string;
  appointment_id: string;
  physician_id: string;
  symptoms: string;
  diagnosis: string;
  prescription: string | null;
  created_at: string;
  updated_at: string;
}

/** One row of get_available_slots(). */
export interface Slot {
  slot_at: string;
  is_available: boolean;
}

/** One row of get_public_appointment(). */
export interface PublicAppointment {
  booking_reference: string;
  appointment_time: string;
  appointment_status: AppointmentStatus;
  department_name: string;
  physician_name: string;
  time_under_review: boolean;
}
