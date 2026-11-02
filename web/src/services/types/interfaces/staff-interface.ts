import { isStaffRole } from "@/helpers/user-role";
import type { StaffMember } from "@/types/staff";
import { fail } from "../../error";

export interface StaffDirectoryRow {
  id: string;
  full_name: string;
  email: string;
  role: string;

  department_id: string | null;
  is_active: boolean;
  invite_pending: boolean;
  created_at: string;
}

export function toStaffMember(row: StaffDirectoryRow): StaffMember {
  if (!isStaffRole(row.role)) fail(null);
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    departmentId: row.department_id,
    isActive: row.is_active,
    invitePending: row.invite_pending,
    createdAt: row.created_at,
  };
}

export const ACTIVE_APPOINTMENT_STATUSES = ["scheduled", "checked_in", "in_progress"];

export function toActiveCounts(rows: { physician_id: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.physician_id] = (counts[row.physician_id] ?? 0) + 1;
  return counts;
}
