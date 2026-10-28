import type { StaffProfile } from './../types/auth';
import { useSyncExternalStore } from "react";
import type { StaffRole } from "@/types/clinic";
import type { User } from "@supabase/supabase-js";
import { loadStaffProfile , signOut as authSignOut } from '@/services/auth-service';
import { supabase } from '@/config/supabase';

// Demo sign-in state. It stands in for Supabase Auth plus the
// current_staff_role() RPC until the API is connected. It is a plain store
// so both React components and TanStack Router's beforeLoad guards can read it.

const STORAGE_KEY = "waitless.demo-role";



function readStoredRole(): StaffRole | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "front_desk" || value === "physician" || value === "admin" ? value : null;
  } catch {
    return null;
  }
}
let user: StaffProfile | null = null
let role: StaffRole | null = readStoredRole();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

let markReady: () => void;
const readyPromise = new Promise<void>((resolve) => (markReady = resolve));

async function applyAuthUser(authUser:User | null){
  if(!authUser){
    user = null
  }else if(authUser.id !== user?.id){
    try {
      user = await loadStaffProfile(authUser)
      if(!user) await authSignOut()
    } catch (error) {
      user = null
    }
  }
  emit()
  markReady()
}

supabase.auth.onAuthStateChange((event, authSession) => {
  if (event === "TOKEN_REFRESHED") return; // same person, nothing to reload
  // Supabase asks not to await its own calls inside this callback.
  setTimeout(() => void applyAuthUser(authSession?.user ?? null), 0);
});




export const session = {
  ready: ()=> readyPromise,
  getUser: () => user,
  getRole: (): StaffRole | null => user?.role ?? null,
  
  async signOut() {
    await authSignOut()
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
