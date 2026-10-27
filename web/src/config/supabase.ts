import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// One client for the whole app: database queries, RPCs, auth and Realtime.
// Values come from web/.env.local (see web/.env.example).
const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Missing Supabase settings. Copy web/.env.example to web/.env.local and fill in the values from `supabase status`.",
  );
}

export const supabase = createClient<Database>(url, publishableKey);
