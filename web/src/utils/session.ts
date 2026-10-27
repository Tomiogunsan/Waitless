import { useSyncExternalStore } from "react";
import type { StaffRole } from "@/types/clinic";

// Demo sign-in state. It stands in for Supabase Auth plus the
// current_staff_role() RPC until the API is connected. It is a plain store
// so both React components and TanStack Router's beforeLoad guards can read it.

const STORAGE_KEY = "waitless.demo-role";

export const ROLE_HOME = {
  front_desk: "/front-desk",
  physician: "/physician",
  admin: "/admin",
} as const satisfies Record<StaffRole, string>;

function readStoredRole(): StaffRole | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "front_desk" || value === "physician" || value === "admin" ? value : null;
  } catch {
    return null;
  }
}

let role: StaffRole | null = readStoredRole();
const listeners = new Set<() => void>();

export const session = {
  getRole: () => role,
  signIn(next: StaffRole) {
    role = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the session still works in memory.
    }
    listeners.forEach((listener) => listener());
  },
  signOut() {
    role = null;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // See signIn.
    }
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export type Session = typeof session;

export function useRole(): StaffRole | null {
  return useSyncExternalStore(session.subscribe, session.getRole);
}
