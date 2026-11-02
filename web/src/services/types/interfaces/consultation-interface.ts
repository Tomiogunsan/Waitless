import type { MedicalInfo, PastVisit, VisitNote } from "@/types/consultation";

export const MEDICAL_INFO_SELECT = "patient_id, allergies, medical_history";
export const VISIT_NOTE_SELECT = "id, appointment_id, symptoms, diagnosis, prescription, updated_at";

export interface MedicalInfoRow {
  patient_id: string;
  allergies: string;
  medical_history: string | null;
}

export interface VisitNoteRow {
  id: string;
  appointment_id: string;
  symptoms: string;
  diagnosis: string;
  prescription: string | null;
  updated_at: string;
}


export interface PastVisitRow {
  appointment_id: string;
  visit_at: string;
  physician_name: string;
  symptoms: string;
  diagnosis: string;

  prescription: string | null;
}

export function toMedicalInfo(row: MedicalInfoRow): MedicalInfo {
  return {
    patientId: row.patient_id,
    allergies: row.allergies,
    medicalHistory: row.medical_history,
  };
}

export function toVisitNote(row: VisitNoteRow): VisitNote {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    symptoms: row.symptoms,
    diagnosis: row.diagnosis,
    prescription: row.prescription,
    updatedAt: row.updated_at,
  };
}

export function toPastVisit(row: PastVisitRow): PastVisit {
  return {
    appointmentId: row.appointment_id,
    visitAt: row.visit_at,
    physicianName: row.physician_name,
    symptoms: row.symptoms,
    diagnosis: row.diagnosis,
    prescription: row.prescription,
  };
}
