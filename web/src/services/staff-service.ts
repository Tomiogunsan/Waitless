import { supabase } from "@/config/supabase";
import type { ChangeRoleInput, InviteStaffInput, ReassignResult, StaffMember } from "@/types/staff";
import { fail, failFromFunction } from "./error";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  toActiveCounts,
  toStaffMember,
  type StaffDirectoryRow,
} from "./types/interfaces/staff-interface";

export async function getStaffDirectory(): Promise<StaffMember[]> {
  const { data, error } = await supabase.rpc("get_staff_directory");
  if (error) fail(error);
  return (data as StaffDirectoryRow[]).map(toStaffMember);
}

export async function inviteStaff(input: InviteStaffInput): Promise<void> {
  const { error } = await supabase.functions.invoke("invite-staff", {
    body: {
      email: input.email,
      full_name: input.fullName,
      role: input.role,
      department_id: input.departmentId,
    },
  });
  if (error) await failFromFunction(error);
}

export async function resendInvite(staffId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("manage-staff", {
    body: { action: "resend_invite", staff_id: staffId },
  });
  if (error) await failFromFunction(error);
}

export async function setStaffActive(staffId: string, active: boolean): Promise<void> {
  const { error } = await supabase.functions.invoke("manage-staff", {
    body: { action: active ? "reactivate" : "deactivate", staff_id: staffId },
  });
  if (error) await failFromFunction(error);
}

export async function changeStaffRole(input: ChangeRoleInput): Promise<void> {
  const { error } = await supabase.rpc("change_staff_role", {
    p_staff_id: input.staffId,
    p_role: input.role,
    p_department_id: input.departmentId ?? undefined,
  });
  if (error) fail(error);
}

export async function reassignPhysicianAppointments(physicianId: string): Promise<ReassignResult> {
  const { data, error } = await supabase.rpc("reassign_physician_appointments", {
    p_physician_id: physicianId,
  });
  if (error) fail(error);
  const row = data[0];
  return { reassigned: row?.reassigned_count ?? 0, needsReview: row?.needs_review_count ?? 0 };
}

export async function getActiveAppointmentCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("appointments")
    .select("physician_id")
    .in("status", ACTIVE_APPOINTMENT_STATUSES);
  if (error) fail(error);
  return toActiveCounts(data);
}

export async function physicianHasHistory(physicianId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("physician_id", physicianId);
  if (error) fail(error);
  return (count ?? 0) > 0;
}
