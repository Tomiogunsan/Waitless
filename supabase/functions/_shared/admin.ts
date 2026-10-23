import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.45.4";
import { corsHeaders, json } from "./http.ts";

export interface AdminClients {
  callerClient: SupabaseClient;
  serviceClient: SupabaseClient;
}

// Check that the request is a POST from an active administrator.
// Returns the clients to use, or a Response to send back immediately.
export async function requireAdmin(
  req: Request,
): Promise<AdminClients | Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Not signed in" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  const callerClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // is_admin() also returns false for deactivated administrators.
  const { data: isAdmin, error } = await callerClient.rpc("is_admin");

  if (error) {
    return json({ error: "Could not verify your account" }, 401);
  }

  if (isAdmin !== true) {
    return json({ error: "Only administrators can manage staff" }, 403);
  }

  const serviceClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  return { callerClient, serviceClient };
}

// Read the JSON body, or return an error Response.
export async function readJson(req: Request): Promise<unknown | Response> {
  try {
    return await req.json();
  } catch {
    return json({ error: "Request body must be valid JSON" }, 400);
  }
}

// Optional link the invite email sends people to (e.g. a set-password page).
export function inviteRedirectUrl(): string | undefined {
  return Deno.env.get("STAFF_INVITE_REDIRECT_URL") ?? undefined;
}
