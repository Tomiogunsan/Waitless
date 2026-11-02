export interface MedicalInfo {
  patientId: string;

  allergies: string;
  medicalHistory: string | null;
}

export interface VisitNote {
  id: string;
  appointmentId: string;
  symptoms: string;
  diagnosis: string;
  prescription: string | null;
  updatedAt: string;
}

export interface PastVisit {
  appointmentId: string;
  visitAt: string;
  physicianName: string;
  symptoms: string;
  diagnosis: string;
  prescription: string | null;
}

export interface SaveVisitNoteInput {
  appointmentId: string;
  symptoms: string;
  diagnosis: string;
  prescription?: string;
}
