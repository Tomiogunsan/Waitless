

import { supabase } from "@/config/supabase";

import { isStaffRole} from "@/helpers/user-role";
import { AuthError, } from "./types/response/auth";
import type { User } from "@supabase/supabase-js";
import type { StaffProfile } from "@/types/auth";






// turns supabase technical message in to ones staff understand
function friendlyMessage(message: string): string {
    if(/invalid login credentials/i.test(message)) return "That email and password don't match an account"
    if(/banned/i.test(message)) return "This account has been deactivated. Contact your clinic admin."
    if (/email not confirmed/i.test(message)) return "Accept the invite in your email before signing in.";
  return "Something went wrong signing in. Please try again.";
}

export async function signIn(email: string, password: string): Promise<User>{
const {data, error} = await supabase.auth.signInWithPassword({email: email.trim().toLowerCase(), password});
if(error) throw new AuthError(friendlyMessage(error.message));
return data.user;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Used by the set-password page after an invite link signs the person in. */
export async function setPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new AuthError(error.message);
}


export async function loadStaffProfile(user: User): Promise<StaffProfile | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, full_name, role, department_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new AuthError("We couldn't load your account. Please try again.");
  if (!data || !isStaffRole(data.role)) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    email: user.email ?? "",
    role: data.role,
    departmentId: data.department_id,
  };
}



