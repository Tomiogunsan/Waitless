import type { StaffRole } from "./clinic";

export interface StaffProfile {
    id: string;
    fullName: string;
    email: string;
    role: StaffRole;
    departmentId: string | null;
}