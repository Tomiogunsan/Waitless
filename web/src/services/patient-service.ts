import { supabase } from "@/config/supabase";
import type { PatientContactInput, PatientDirectoryPage, PatientRecord } from "@/types/patient";
import { phoneSearchDigits, searchText } from "@/utils/format";
import { fail } from "./error";
import {
  DUPLICATE_PHONE_MESSAGE,
  PATIENT_DIRECTORY_SELECT,
  PATIENT_SELECT,
  UNIQUE_VIOLATION,
  toDirectoryRow,
  toPatient,
  type PatientDirectoryDbRow,
} from "./types/interfaces/patient-interface";

export async function getPatientDirectory(
  query: string,
  page: number,
  pageSize: number,
): Promise<PatientDirectoryPage> {
  const text = searchText(query);
  const digits = phoneSearchDigits(query);
  const filters = [
    text && `full_name.ilike.%${text}%`,
    text && `email.ilike.%${text}%`,
    digits.length >= 3 && `phone.ilike.%${digits}%`,
  ].filter(Boolean);
  const from = (page - 1) * pageSize;

  let request = supabase
    .from("patient_directory")
    .select(PATIENT_DIRECTORY_SELECT, { count: "exact" })
    .order("full_name")
    .range(from, from + pageSize - 1);
  if (filters.length > 0) request = request.or(filters.join(","));

  const { data, error, count } = await request;
  if (error) fail(error);
  return {
    rows: (data as PatientDirectoryDbRow[]).map(toDirectoryRow),
    total: count ?? 0,
  };
}

export async function getPatient(patientId: string): Promise<PatientRecord | null> {
  const { data, error } = await supabase
    .from("patients")
    .select(PATIENT_SELECT)
    .eq("id", patientId)
    .maybeSingle();
  if (error) fail(error);
  return data && toPatient(data);
}

export async function findPatientByPhone(phone: string): Promise<PatientRecord | null> {
  const { data, error } = await supabase
    .from("patients")
    .select(PATIENT_SELECT)
    .eq("phone", phone)
    .maybeSingle();
  if (error) fail(error);
  return data && toPatient(data);
}

export async function registerPatient(input: PatientContactInput): Promise<PatientRecord> {
  const { data, error } = await supabase
    .from("patients")
    .insert({ full_name: input.fullName, phone: input.phone, email: input.email || null })
    .select(PATIENT_SELECT)
    .single();
  if (error?.code === UNIQUE_VIOLATION) fail({ message: DUPLICATE_PHONE_MESSAGE });
  if (error) fail(error);
  return toPatient(data);
}

export async function updatePatientContact(
  patientId: string,
  input: PatientContactInput,
): Promise<PatientRecord> {
  const { data, error } = await supabase
    .from("patients")
    .update({ full_name: input.fullName, phone: input.phone, email: input.email || null })
    .eq("id", patientId)
    .select(PATIENT_SELECT)
    .single();
  if (error?.code === UNIQUE_VIOLATION) fail({ message: DUPLICATE_PHONE_MESSAGE });
  if (error) fail(error);
  return toPatient(data);
}
