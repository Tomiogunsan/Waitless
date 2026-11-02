import { supabase } from "@/config/supabase";
import type { PatientSummary, Physician, StaffAppointment } from "@/types/appointment";
import { phoneSearchDigits, searchText } from "@/utils/format";
import { clinicDayRange } from "@/utils/time";
import { fail } from "./error";
import { APPOINTMENT_SELECT, toAppointment, type AppointmentRow } from "./types/interfaces/appointment-interface";

export async function getDayAppointments(date: string): Promise<StaffAppointment[]> {
  const { start, end } = clinicDayRange(date);
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .gte("scheduled_at", start)
    .lt("scheduled_at", end)
    .order("scheduled_at");
  if (error) fail(error);
  return (data as AppointmentRow[]).map(toAppointment);
}


export async function getAppointment(appointmentId: string): Promise<StaffAppointment | null> {
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("id", appointmentId)
    .maybeSingle();
  if (error) fail(error);
  return data && toAppointment(data as AppointmentRow);
}

export async function getPatientAppointments(patientId: string): Promise<StaffAppointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("patient_id", patientId)
    .order("scheduled_at", { ascending: false });
  if (error) fail(error);
  return (data as AppointmentRow[]).map(toAppointment);
}

export async function getPhysicianDay(physicianId: string, date: string): Promise<StaffAppointment[]> {
  const { start, end } = clinicDayRange(date);
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("physician_id", physicianId)
    .gte("scheduled_at", start)
    .lt("scheduled_at", end)
    .order("scheduled_at");
  if (error) fail(error);
  return (data as AppointmentRow[]).map(toAppointment);
}

export async function getPhysicians(): Promise<Physician[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, full_name, department_id")
    .eq("role", "physician")
    .eq("is_active", true)
    .order("full_name");
  if (error) fail(error);
  return data
    .filter((row) => row.department_id !== null)
    .map((row) => ({ id: row.id, fullName: row.full_name, departmentId: row.department_id! }));
}

export async function searchPatients(query: string): Promise<PatientSummary[]> {
  const text = searchText(query);
  const digits = phoneSearchDigits(query);
  const filters = [
    text && `full_name.ilike.%${text}%`,
    digits.length >= 3 && `phone.ilike.%${digits}%`,
  ].filter(Boolean);
  if (filters.length === 0) return [];

  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, phone")
    .or(filters.join(","))
    .order("full_name")
    .limit(5);
  if (error) fail(error);
  return data.map((row) => ({ id: row.id, fullName: row.full_name, phone: row.phone }));
}

export async function checkInAppointment(appointmentId: string): Promise<void> {
  const { error } = await supabase.rpc("check_in_appointment", { p_appointment_id: appointmentId });
  if (error) fail(error);
}

export async function markNoShow(appointmentId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_appointment_no_show", { p_appointment_id: appointmentId });
  if (error) fail(error);
}

export async function cancelAppointment(appointmentId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_appointment", {
    p_appointment_id: appointmentId,
    p_reason: reason || undefined,
  });
  if (error) fail(error);
}

export async function rescheduleAppointment(appointmentId: string, newSlotAt: string): Promise<void> {
  const { error } = await supabase.rpc("reschedule_appointment", {
    p_appointment_id: appointmentId,
    p_new_scheduled_at: newSlotAt,
  });
  if (error) fail(error);
}

/** Leave physicianId out to let the database pick the first free doctor. Returns the new physician's id. */
export async function reassignAppointment(appointmentId: string, physicianId?: string): Promise<string> {
  const { data, error } = await supabase.rpc("reassign_appointment", {
    p_appointment_id: appointmentId,
    p_new_physician_id: physicianId,
  });
  if (error) fail(error);
  return data;
}

/** Front desk books a returning patient with a specific doctor. Returns the new appointment's id. */
export async function bookForPatient(patientId: string, physicianId: string, slotAt: string): Promise<string> {
  const { data, error } = await supabase.rpc("book_appointment", {
    p_patient_id: patientId,
    p_physician_id: physicianId,
    p_scheduled_at: slotAt,
  });
  if (error) fail(error);
  return data;
}
