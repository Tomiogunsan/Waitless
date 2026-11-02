export interface PatientRecord {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  createdAt: string;
}

export interface PatientDirectoryRow extends PatientRecord {
  lastVisitAt: string | null;
  nextAppointmentAt: string | null;
}

export interface PatientDirectoryPage {
  rows: PatientDirectoryRow[];
  total: number;
}

export interface PatientContactInput {
  fullName: string;
  phone: string;
  email?: string;
}
