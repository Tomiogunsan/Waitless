import type { PatientDirectoryRow, PatientRecord } from "@/types/patient";

export const PATIENT_SELECT = "id, full_name, phone, email, created_at";
export const PATIENT_DIRECTORY_SELECT = `${PATIENT_SELECT}, last_visit_at, next_appointment_at`;

export const DUPLICATE_PHONE_MESSAGE = "This number already belongs to a patient";
export const UNIQUE_VIOLATION = "23505";

export interface PatientRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at: string;
}


export interface PatientDirectoryDbRow extends PatientRow {
  last_visit_at: string | null;
  next_appointment_at: string | null;
}

export function toPatient(row: PatientRow): PatientRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    createdAt: row.created_at,
  };
}

export function toDirectoryRow(row: PatientDirectoryDbRow): PatientDirectoryRow {
  return {
    ...toPatient(row),
    lastVisitAt: row.last_visit_at,
    nextAppointmentAt: row.next_appointment_at,
  };
}
