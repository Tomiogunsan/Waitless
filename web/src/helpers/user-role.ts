import type { StaffRole } from "@/types/clinic";


export const ROLE_HOME = {
  front_desk: "/front-desk",
  physician: "/physician",
  admin: "/admin",
} as const satisfies Record<StaffRole, string>;


export const ROLE_LABELS = {
  physician: "Physician",
  front_desk: "Front desk",
  admin: "Admin",
} as const satisfies Record<StaffRole, string>;

export function isStaffRole(value:unknown): value is StaffRole {
    return typeof value === 'string' && value in ROLE_HOME;
}