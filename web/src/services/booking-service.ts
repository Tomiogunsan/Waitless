import { fail } from "./error";
import { toStatus } from "./types/interfaces/booking-interface";
import { supabase } from "@/config/supabase";
import type {
  BookAppointmentInput,
  BookingConfirmation,
  Department,
  PublicAppointment,
  Slot,
} from "@/types/booking";


export async function getDepartments(): Promise<Department[]> {
  const { data, error } = await supabase.from("departments").select("id, name").order("name");
  if (error) fail(error);
  return data;
}

export async function getAvailableSlots(departmentId: string, date: string): Promise<Slot[]> {
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_department_id: departmentId,
    p_date: date,
  });
  if (error) fail(error);
  return data.map((row) => ({ slotAt: row.slot_at, isAvailable: row.is_available }));
}
export async function bookAppointment(input: BookAppointmentInput): Promise<BookingConfirmation> {
  const { data, error } = await supabase.rpc("book_public_appointment", {
    p_department_id: input.departmentId,
    p_scheduled_at: input.slotAt,
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_email: input.email || undefined,
  });
  if (error) fail(error);
  const row = data[0];
  if (!row) fail(null);
  return {
    reference: row.booking_reference,
    appointmentTime: row.appointment_time,
    departmentName: row.department_name,
  };
}

/** Returns null when the reference and phone don't match a booking. */
export async function getPublicAppointment(reference: string, phone: string): Promise<PublicAppointment | null> {
  const { data, error } = await supabase.rpc("get_public_appointment", {
    p_reference_code: reference,
    p_phone: phone,
  });
  if (error) fail(error);
  const row = data[0];
  if (!row) return null;
  return {
    reference: row.booking_reference,
    appointmentTime: row.appointment_time,
    status: toStatus(row.appointment_status),
    departmentName: row.department_name,
    physicianName: row.physician_name,
    timeUnderReview: row.time_under_review,
  };
}

export async function reschedulePublicAppointment(
  reference: string,
  phone: string,
  newSlotAt: string,
): Promise<BookingConfirmation> {
  const { data, error } = await supabase.rpc("reschedule_public_appointment", {
    p_reference_code: reference,
    p_phone: phone,
    p_new_scheduled_at: newSlotAt,
  });
  if (error) fail(error);
  const row = data[0];
  if (!row) fail(null);
  return {
    reference: row.booking_reference,
    appointmentTime: row.appointment_time,
    departmentName: row.department_name,
  };
}

export async function cancelPublicAppointment(reference: string, phone: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_public_appointment", {
    p_reference_code: reference,
    p_phone: phone,
    p_reason: reason || undefined,
  });
  if (error) fail(error);
}


