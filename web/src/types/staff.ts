import type { StaffRole } from "./clinic";

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  departmentId: string | null;
  isActive: boolean;
  invitePending: boolean;
  createdAt: string;
}

export interface InviteStaffInput {
  email: string;
  fullName: string;
  role: StaffRole;
  departmentId: string | null;
}

export interface ChangeRoleInput {
  staffId: string;
  role: StaffRole;
  departmentId: string | null;
}

export interface ReassignResult {
  reassigned: number;
  needsReview: number;
}
