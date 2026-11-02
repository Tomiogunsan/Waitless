import type { StaffRole } from "@/types/clinic";


export const DEMO_PASSWORD = "Waitless@2026";

export const DEMO_ACCOUNTS: Record<StaffRole, string> = {
  front_desk: "chidinma@waitless.health",
  physician: "adaeze@waitless.health",
  admin: "folake@waitless.health",
};

export const DEMO_LOOKUP = { reference: "CLN-7F3A9C21B4E8", phone: "0803 123 4567" };