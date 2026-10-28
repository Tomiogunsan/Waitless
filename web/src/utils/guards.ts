import { redirect } from "@tanstack/react-router";
import type { StaffRole } from "@/types/clinic";
import { type Session } from "./session";
import { ROLE_HOME } from "@/helpers/user-role";

/**
 * Route guard for staff pages. Mirrors the database's role checks so the
 * UI never shows a screen whose data the user isn't allowed to load.
 */
export async function requireRole(session: Session, allowed: StaffRole[]) {
  await session.ready()
  const role = session.getRole();
  if (!role) throw redirect({ to: "/login" });
  if (!allowed.includes(role)) throw redirect({ to: ROLE_HOME[role] });
  return role;
}
