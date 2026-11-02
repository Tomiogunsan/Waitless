import { supabase } from "@/config/supabase";
import type { MedicalInfo, PastVisit, SaveVisitNoteInput, VisitNote } from "@/types/consultation";
import { fail } from "./error";
import {
  MEDICAL_INFO_SELECT,
  VISIT_NOTE_SELECT,
  toMedicalInfo,
  toPastVisit,
  toVisitNote,
  type PastVisitRow,
} from "./types/interfaces/consultation-interface";


export async function getMedicalInfo(patientIds: string[]): Promise<MedicalInfo[]> {
  if (patientIds.length === 0) return [];
  const { data, error } = await supabase
    .from("patient_medical_info")
    .select(MEDICAL_INFO_SELECT)
    .in("patient_id", patientIds);
  if (error) fail(error);
  return data.map(toMedicalInfo);
}


export async function getVisitNote(appointmentId: string): Promise<VisitNote | null> {
  const { data, error } = await supabase
    .from("visit_notes")
    .select(VISIT_NOTE_SELECT)
    .eq("appointment_id", appointmentId)
    .maybeSingle();
  if (error) fail(error);
  return data && toVisitNote(data);
}

export async function getVisitHistory(patientId: string): Promise<PastVisit[]> {
  const { data, error } = await supabase.rpc("get_patient_visit_history", { p_patient_id: patientId });
  if (error) fail(error);
  return (data as PastVisitRow[]).map(toPastVisit);
}

export async function startConsultation(appointmentId: string): Promise<void> {
  const { error } = await supabase.rpc("start_consultation", { p_appointment_id: appointmentId });
  if (error) fail(error);
}


export async function saveVisitNote(input: SaveVisitNoteInput): Promise<string> {
  const { data, error } = await supabase.rpc("save_visit_note", {
    p_appointment_id: input.appointmentId,
    p_symptoms: input.symptoms,
    p_diagnosis: input.diagnosis,
    p_prescription: input.prescription || undefined,
  });
  if (error) fail(error);
  return data;
}


export async function completeConsultation(appointmentId: string): Promise<void> {
  const { error } = await supabase.rpc("complete_consultation", { p_appointment_id: appointmentId });
  if (error) fail(error);
}
