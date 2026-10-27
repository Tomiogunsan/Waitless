import { redirect } from "@tanstack/react-router";
import type { StaffRole } from "@/types/clinic";
import { ROLE_HOME, type Session } from "./session";

/**
 * Route guard for staff pages. Mirrors the database's role checks so the
 * UI never shows a screen whose data the user isn't allowed to load.
 */
export function requireRole(session: Session, allowed: StaffRole[]) {
  const role = session.getRole();
  if (!role) throw redirect({ to: "/login" });
  if (!allowed.includes(role)) throw redirect({ to: ROLE_HOME[role] });
  return role;
}
