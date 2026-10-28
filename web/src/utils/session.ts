import type { User } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { supabase } from "@/config/supabase";
import { loadStaffProfile, signIn as authSignIn, signOut as authSignOut } from "@/services/auth-service";
import { AuthError } from "@/services/types/response/auth";
import type { StaffProfile } from "@/types/auth";
import type { StaffRole } from "@/types/clinic";

// Who is signed in, kept in sync with Supabase Auth. A plain store (not
// React state) so both components and TanStack Router's beforeLoad guards
// can read it.

let user: StaffProfile | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

let markReady: () => void;
const readyPromise = new Promise<void>((resolve) => (markReady = resolve));

async function applyAuthUser(authUser: User | null) {
  if (!authUser) {
    user = null;
  } else if (authUser.id !== user?.id) {
    try {
      user = await loadStaffProfile(authUser);
      // Signed in but no access (e.g. deactivated): end the session.
      if (!user) await authSignOut();
    } catch {
      user = null;
    }
  }
  emit();
  markReady();
}

supabase.auth.onAuthStateChange((event, authSession) => {
  if (event === "TOKEN_REFRESHED") return; // same person, nothing to reload
  // Supabase asks not to await its own calls inside this callback.
  setTimeout(() => void applyAuthUser(authSession?.user ?? null), 0);
});

export const session = {
  /** Resolves once the saved login (if any) has been checked on page load. */
  ready: () => readyPromise,
  getUser: () => user,
  getRole: (): StaffRole | null => user?.role ?? null,
  /** Signs in, then waits until we know who they are, so guards see them straight away. */
  async signIn(email: string, password: string): Promise<StaffProfile> {
    const authUser = await authSignIn(email, password);
    await applyAuthUser(authUser);
    if (!user) throw new AuthError("This account has been deactivated. Contact your clinic admin.");
    return user;
  },
  async signOut() {
    await authSignOut();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export type Session = typeof session;

export function useCurrentUser(): StaffProfile | null {
  return useSyncExternalStore(session.subscribe, session.getUser);
}

export function useRole(): StaffRole | null {
  return useSyncExternalStore(session.subscribe, session.getRole);
}
