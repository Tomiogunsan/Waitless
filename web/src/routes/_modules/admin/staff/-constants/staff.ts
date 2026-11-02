import type { StaffRole } from "@/types/clinic";
import type { StaffMember } from "@/types/staff";

export type RoleFilter = "all" | StaffRole;

export type StaffDialogState = { kind: "role" | "deactivate"; member: StaffMember } | null;

export const ROLE_OPTIONS: { role: StaffRole; description: string }[] = [
  { role: "physician", description: "Sees their queue and writes visit notes" },
  { role: "front_desk", description: "Books, checks in and manages the day" },
  { role: "admin", description: "Manages staff and sees analytics" },
];
