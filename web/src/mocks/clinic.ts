// Mock clinic data shaped exactly like the Supabase tables.
// "Today" is a busy clinic morning; see lib/demo-clock.ts.

import { DEMO_TODAY } from "@/lib/demo-clock";
import { addDays, atClinicTime } from "@/lib/time";
import type {
  Appointment,
  AppointmentStatus,
  Department,
  Patient,
  PatientMedicalInfo,
  Staff,
  StaffRole,
  VisitNote,
} from "@/types/clinic";

export const departments: Department[] = [
  { id: "dep-gm", name: "General Medicine" },
  { id: "dep-paed", name: "Paediatrics" },
  { id: "dep-og", name: "Obstetrics & Gynaecology" },
  { id: "dep-derm", name: "Dermatology" },
];

const joined = (daysAgo: number) => atClinicTime(addDays(DEMO_TODAY, -daysAgo), "09:00").toISOString();

export const staff: Staff[] = [
  { id: "stf-folake", full_name: "Folake Adeyemi", email: "folake@waitless.health", role: "admin", department_id: null, is_active: true, invite_pending: false, created_at: joined(240) },
  { id: "stf-emeka", full_name: "Emeka Obi", email: "emeka@waitless.health", role: "admin", department_id: null, is_active: true, invite_pending: false, created_at: joined(180) },
  { id: "stf-chidinma", full_name: "Chidinma Okafor", email: "chidinma@waitless.health", role: "front_desk", department_id: null, is_active: true, invite_pending: false, created_at: joined(200) },
  { id: "stf-musa", full_name: "Musa Ibrahim", email: "musa@waitless.health", role: "front_desk", department_id: null, is_active: true, invite_pending: false, created_at: joined(95) },
  { id: "stf-adaeze", full_name: "Dr. Adaeze Nwosu", email: "adaeze@waitless.health", role: "physician", department_id: "dep-gm", is_active: true, invite_pending: false, created_at: joined(230) },
  { id: "stf-tunde", full_name: "Dr. Tunde Bakare", email: "tunde@waitless.health", role: "physician", department_id: "dep-gm", is_active: true, invite_pending: false, created_at: joined(160) },
  { id: "stf-ngozi", full_name: "Dr. Ngozi Eze", email: "ngozi@waitless.health", role: "physician", department_id: "dep-paed", is_active: true, invite_pending: false, created_at: joined(150) },
  { id: "stf-kemi", full_name: "Dr. Kemi Alabi", email: "kemi@waitless.health", role: "physician", department_id: "dep-og", is_active: true, invite_pending: false, created_at: joined(120) },
  { id: "stf-sule", full_name: "Dr. Ibrahim Sule", email: "ibrahim@waitless.health", role: "physician", department_id: "dep-derm", is_active: true, invite_pending: false, created_at: joined(110) },
  { id: "stf-yemi", full_name: "Dr. Yemi Ogunleye", email: "yemi@waitless.health", role: "physician", department_id: "dep-paed", is_active: true, invite_pending: true, created_at: joined(2) },
  { id: "stf-bayo", full_name: "Bayo Martins", email: "bayo@waitless.health", role: "front_desk", department_id: null, is_active: false, invite_pending: false, created_at: joined(300) },
];

/** The signed-in person for each demo role. */
export const CURRENT_USER: Record<StaffRole, string> = {
  admin: "stf-folake",
  front_desk: "stf-chidinma",
  physician: "stf-adaeze",
};

export const patients: Patient[] = [
  { id: "pat-amaka", full_name: "Amaka Obi", phone: "+2348031234567", email: "amaka.obi@gmail.com", created_at: joined(140) },
  { id: "pat-segun", full_name: "Segun Adebayo", phone: "+2348025550142", email: null, created_at: joined(90) },
  { id: "pat-halima", full_name: "Halima Yusuf", phone: "+2347061118823", email: "halima.y@yahoo.com", created_at: joined(60) },
  { id: "pat-chuka", full_name: "Chukwuemeka Nnaji", phone: "+2348139872210", email: null, created_at: joined(45) },
  { id: "pat-funmi", full_name: "Funmilayo Ade", phone: "+2349012347765", email: "funmi.ade@outlook.com", created_at: joined(38) },
  { id: "pat-ifeanyi", full_name: "Ifeanyi Okeke", phone: "+2348054410098", email: null, created_at: joined(30) },
  { id: "pat-zainab", full_name: "Zainab Bello", phone: "+2347035562214", email: "zainab.bello@gmail.com", created_at: joined(26) },
  { id: "pat-tobi", full_name: "Tobi Lawal", phone: "+2348167743320", email: null, created_at: joined(21) },
  { id: "pat-ngozi", full_name: "Ngozi Umeh", phone: "+2348092201176", email: "ngozi.umeh@gmail.com", created_at: joined(18) },
  { id: "pat-kunle", full_name: "Kunle Afolabi", phone: "+2348033347781", email: null, created_at: joined(12) },
  { id: "pat-blessing", full_name: "Blessing Etim", phone: "+2347089934412", email: "blessing.etim@gmail.com", created_at: joined(9) },
  { id: "pat-musa", full_name: "Musa Danjuma", phone: "+2348026671193", email: null, created_at: joined(6) },
  { id: "pat-ada", full_name: "Ada Eze (child)", phone: "+2348128850034", email: "eze.family@gmail.com", created_at: joined(4) },
  { id: "pat-emeka", full_name: "Emeka Nwankwo", phone: "+2349063328819", email: null, created_at: joined(1) },
];

export const medicalInfo: PatientMedicalInfo[] = [
  { patient_id: "pat-amaka", allergies: "Penicillin (rash), shellfish", medical_history: "Mild asthma since childhood. Uses salbutamol inhaler as needed.", updated_at: joined(14) },
  { patient_id: "pat-segun", allergies: "None known", medical_history: "Hypertension, on amlodipine 5 mg daily.", updated_at: joined(30) },
  { patient_id: "pat-halima", allergies: "Sulfa drugs", medical_history: "Second pregnancy, 24 weeks.", updated_at: joined(7) },
  { patient_id: "pat-chuka", allergies: "Unknown", medical_history: null, updated_at: joined(45) },
  { patient_id: "pat-funmi", allergies: "None known", medical_history: "Type 2 diabetes, diet-controlled.", updated_at: joined(10) },
  { patient_id: "pat-ifeanyi", allergies: "Ibuprofen", medical_history: null, updated_at: joined(30) },
  { patient_id: "pat-zainab", allergies: "None known", medical_history: "Recurrent eczema flare-ups.", updated_at: joined(26) },
  { patient_id: "pat-tobi", allergies: "Unknown", medical_history: null, updated_at: joined(21) },
  { patient_id: "pat-ngozi", allergies: "Latex", medical_history: "Migraine with aura.", updated_at: joined(18) },
  { patient_id: "pat-kunle", allergies: "None known", medical_history: null, updated_at: joined(12) },
  { patient_id: "pat-blessing", allergies: "Peanuts (anaphylaxis)", medical_history: "Carries an adrenaline auto-injector.", updated_at: joined(9) },
  { patient_id: "pat-musa", allergies: "Unknown", medical_history: null, updated_at: joined(6) },
  { patient_id: "pat-ada", allergies: "None known", medical_history: "Age 4. Fully immunised.", updated_at: joined(4) },
  { patient_id: "pat-emeka", allergies: "Unknown", medical_history: null, updated_at: joined(1) },
];

// ---------------------------------------------------------------------------
// Appointments

const REFERENCE_CODES = [
  "7F3A9C21B4E8", "2B8D41E07C55", "C41F9A3D2E70", "9E0B7C4A1D36", "5A2C8E6F1B94",
  "D73B0A9E4C21", "1C9E5B7A3F08", "8B4D2F6C0E19", "E6A1C3B9D752", "3F7E9D1A5C40",
  "B05C8A2E7F13", "6D9F1B3C8A27", "A8E2C6F0D541", "4C1A7E9B3D86", "F92D5B1E6A03",
  "0E7B3D9C5F24", "7A4C1E8B2D69", "C3B9F5D1A706", "2D6E0A8C4B91", "9B1F7D3E5C28",
  "5E8A2C6B0F47", "D1C7B3F9A562", "8F5D1B7C3E90", "3A9C5E1D7B64",
];
let refIndex = 0;

function at(daysFromToday: number, time: string): string {
  return atClinicTime(addDays(DEMO_TODAY, daysFromToday), time).toISOString();
}

interface AppointmentSeed {
  patient: string;
  physician: string;
  day?: number;
  time: string;
  status: AppointmentStatus;
  originalTime?: string;
  checkedIn?: string;
  started?: string;
  ended?: string;
  cancellationReason?: string;
  reviewReason?: string;
}

function appointment(seed: AppointmentSeed): Appointment {
  const day = seed.day ?? 0;
  const physician = staff.find((s) => s.id === seed.physician)!;
  return {
    id: `apt-${refIndex + 1}`,
    reference_code: `CLN-${REFERENCE_CODES[refIndex++]}`,
    patient_id: seed.patient,
    physician_id: seed.physician,
    department_id: physician.department_id!,
    original_scheduled_at: at(day, seed.originalTime ?? seed.time),
    scheduled_at: at(day, seed.time),
    checked_in_at: seed.checkedIn ? at(day, seed.checkedIn) : null,
    actual_started_at: seed.started ? at(day, seed.started) : null,
    actual_ended_at: seed.ended ? at(day, seed.ended) : null,
    status: seed.status,
    cancellation_reason: seed.cancellationReason ?? null,
    reschedule_needs_review: Boolean(seed.reviewReason),
    reschedule_review_reason: seed.reviewReason ?? null,
  };
}

export const appointments: Appointment[] = [
  // Today: Dr. Adaeze Nwosu (General Medicine), running about 20 minutes late.
  appointment({ patient: "pat-segun", physician: "stf-adaeze", time: "08:40", status: "completed", checkedIn: "08:31", started: "08:44", ended: "09:21" }),
  appointment({ patient: "pat-funmi", physician: "stf-adaeze", time: "09:20", status: "completed", checkedIn: "09:12", started: "09:24", ended: "10:06" }),
  appointment({ patient: "pat-amaka", physician: "stf-adaeze", time: "10:00", status: "in_progress", checkedIn: "09:51", started: "10:21" }),
  appointment({ patient: "pat-kunle", physician: "stf-adaeze", time: "10:40", status: "checked_in", checkedIn: "10:31" }),
  appointment({ patient: "pat-emeka", physician: "stf-adaeze", time: "11:20", status: "checked_in", checkedIn: "10:44" }),
  appointment({ patient: "pat-ifeanyi", physician: "stf-adaeze", time: "13:00", status: "scheduled" }),
  appointment({ patient: "pat-musa", physician: "stf-adaeze", time: "13:40", status: "scheduled" }),
  appointment({ patient: "pat-tobi", physician: "stf-adaeze", time: "15:00", status: "scheduled" }),

  // Today: Dr. Tunde Bakare (General Medicine).
  appointment({ patient: "pat-chuka", physician: "stf-tunde", time: "08:40", status: "completed", checkedIn: "08:35", started: "08:41", ended: "09:17" }),
  appointment({ patient: "pat-ngozi", physician: "stf-tunde", time: "09:20", status: "no_show" }),
  appointment({ patient: "pat-blessing", physician: "stf-tunde", time: "10:40", status: "in_progress", checkedIn: "10:33", started: "10:41" }),
  appointment({ patient: "pat-zainab", physician: "stf-tunde", time: "14:20", status: "scheduled" }),

  // Today: Dr. Ngozi Eze (Paediatrics).
  appointment({ patient: "pat-ada", physician: "stf-ngozi", time: "10:40", status: "checked_in", checkedIn: "10:25" }),
  appointment({ patient: "pat-halima", physician: "stf-ngozi", time: "13:00", status: "cancelled", cancellationReason: "Patient travelling" }),

  // Today: Dr. Kemi Alabi (Obstetrics & Gynaecology): moved by a delay, needs review.
  appointment({ patient: "pat-halima", physician: "stf-kemi", time: "11:32", originalTime: "11:20", status: "scheduled", reviewReason: "Consultation delay requires staff review; later appointments could not all be safely rescheduled." }),

  // Today: Dr. Ibrahim Sule (Dermatology).
  appointment({ patient: "pat-zainab", physician: "stf-sule", time: "10:40", status: "checked_in", checkedIn: "10:38" }),
  appointment({ patient: "pat-funmi", physician: "stf-sule", time: "16:20", status: "scheduled" }),

  // Upcoming.
  appointment({ patient: "pat-amaka", physician: "stf-tunde", day: 7, time: "10:40", status: "scheduled" }),
  appointment({ patient: "pat-segun", physician: "stf-adaeze", day: 14, time: "09:20", status: "scheduled" }),

  // History.
  appointment({ patient: "pat-amaka", physician: "stf-tunde", day: -21, time: "09:20", status: "completed", checkedIn: "09:10", started: "09:22", ended: "09:58" }),
  appointment({ patient: "pat-amaka", physician: "stf-adaeze", day: -63, time: "13:40", status: "completed", checkedIn: "13:31", started: "13:47", ended: "14:19" }),
  appointment({ patient: "pat-kunle", physician: "stf-tunde", day: -12, time: "15:00", status: "completed", checkedIn: "14:52", started: "15:04", ended: "15:36" }),
  appointment({ patient: "pat-segun", physician: "stf-adaeze", day: -30, time: "08:40", status: "completed", checkedIn: "08:36", started: "08:42", ended: "09:15" }),
  appointment({ patient: "pat-emeka", physician: "stf-tunde", day: -1, time: "16:20", status: "cancelled", cancellationReason: "Rebooked for today" }),
];

export const visitNotes: VisitNote[] = [
  { id: "note-1", appointment_id: "apt-20", physician_id: "stf-tunde", symptoms: "Wheezing at night for 5 days, dry cough, mild chest tightness after exercise.", diagnosis: "Mild asthma exacerbation, likely triggered by harmattan dust.", prescription: "Beclometasone 100 mcg inhaler, 2 puffs twice daily for 4 weeks. Continue salbutamol as needed.", created_at: at(-21, "09:57"), updated_at: at(-21, "09:57") },
  { id: "note-2", appointment_id: "apt-21", physician_id: "stf-adaeze", symptoms: "Sore throat and fever (38.4 °C) for 2 days.", diagnosis: "Viral pharyngitis.", prescription: "Paracetamol 1 g up to 4 times daily. Warm saline gargles. Avoid penicillin-based antibiotics (allergy).", created_at: at(-63, "14:18"), updated_at: at(-63, "14:18") },
  { id: "note-3", appointment_id: "apt-22", physician_id: "stf-tunde", symptoms: "Lower back pain after lifting, no numbness or weakness.", diagnosis: "Mechanical lower back strain.", prescription: "Paracetamol, gentle stretching. Review if not improved in 2 weeks.", created_at: at(-12, "15:35"), updated_at: at(-12, "15:35") },
  { id: "note-4", appointment_id: "apt-23", physician_id: "stf-adaeze", symptoms: "Routine blood pressure review. Occasional morning headaches.", diagnosis: "Hypertension, well controlled (128/82).", prescription: "Continue amlodipine 5 mg daily.", created_at: at(-30, "09:14"), updated_at: at(-30, "09:14") },
  { id: "note-5", appointment_id: "apt-1", physician_id: "stf-adaeze", symptoms: "Follow-up. Headaches resolved, home readings 125/80.", diagnosis: "Hypertension, controlled.", prescription: "Continue amlodipine 5 mg daily. Review in 3 months.", created_at: at(0, "09:20"), updated_at: at(0, "09:20") },
  { id: "note-6", appointment_id: "apt-2", physician_id: "stf-adaeze", symptoms: "Increased thirst, fasting glucose 7.9 mmol/L on home monitor.", diagnosis: "Type 2 diabetes, suboptimal control.", prescription: "Start metformin 500 mg once daily with evening meal. Dietitian referral.", created_at: at(0, "10:05"), updated_at: at(0, "10:05") },
];

// ---------------------------------------------------------------------------
// Lookups

export const getDepartment = (id: string) => departments.find((d) => d.id === id);
export const getStaff = (id: string) => staff.find((s) => s.id === id);
export const getMedicalInfo = (patientId: string) => medicalInfo.find((m) => m.patient_id === patientId);
export const physicians = () => staff.filter((s) => s.role === "physician" && s.is_active && !s.invite_pending);
