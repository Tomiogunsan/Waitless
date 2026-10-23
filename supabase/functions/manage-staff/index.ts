// Deactivate, reactivate, or resend the invite for a staff member.
// Only administrators may call this function.


import {
  type AdminClients,
  inviteRedirectUrl,
  readJson,
  requireAdmin,
} from "../_shared/admin.ts";
import { json } from "../_shared/http.ts";

const ACTIONS = ["deactivate", "reactivate", "resend_invite"] as const;
type Action = (typeof ACTIONS)[number];

// Blocks sign-in for about 100 years; "none" lifts the block.
const PERMANENT_BAN = "876000h";

function parseRequest(
  body: unknown,
): { action: Action; staff_id: string } | string {
  if (typeof body !== "object" || body === null) {
    return "Request body must be a JSON object";
  }

  const { action, staff_id } = body as Record<string, unknown>;

  if (typeof action !== "string" || !ACTIONS.includes(action as Action)) {
    return `Action must be one of: ${ACTIONS.join(", ")}`;
  }

  if (typeof staff_id !== "string" || staff_id.length === 0) {
    return "staff_id is required";
  }

  return { action: action as Action, staff_id };
}

// Update the database first: it decides what the account can access,
// and its rules (no self-changes, no physician with active
// appointments) are enforced there. Then block or allow sign-in.
// Both steps are safe to retry if either fails.
async function setActive(
  { callerClient, serviceClient }: AdminClients,
  staffId: string,
  active: boolean,
): Promise<Response> {
  const { error: dbError } = await callerClient.rpc("set_staff_active", {
    p_staff_id: staffId,
    p_active: active,
  });

  if (dbError) {
    return json({ error: dbError.message }, 400);
  }

  const { error: authError } = await serviceClient.auth.admin.updateUserById(
    staffId,
    { ban_duration: active ? "none" : PERMANENT_BAN },
  );

  if (authError) {
    return json(
      {
        error: active
          ? "Account reactivated, but sign-in is still blocked; please retry"
          : "Account access removed, but sign-in could not be blocked; please retry",
      },
      502,
    );
  }

  return json({ staff_id: staffId, is_active: active });
}

// Send the invite email again to someone who has not accepted it yet.
async function resendInvite(
  { serviceClient }: AdminClients,
  staffId: string,
): Promise<Response> {
  const { data: staff } = await serviceClient
    .from("staff")
    .select("full_name, role, is_active")
    .eq("id", staffId)
    .maybeSingle();

  if (!staff) {
    return json({ error: "Staff member not found" }, 404);
  }

  if (!staff.is_active) {
    return json({ error: "Reactivate this staff member first" }, 409);
  }

  const { data: authUser, error: userError } = await serviceClient.auth.admin
    .getUserById(staffId);

  if (userError || !authUser?.user?.email) {
    return json({ error: "Could not find this staff member's account" }, 404);
  }

  if (authUser.user.email_confirmed_at) {
    return json({ error: "This staff member has already accepted the invite" }, 409);
  }

  const { error: inviteError } = await serviceClient.auth.admin
    .inviteUserByEmail(authUser.user.email, {
      data: { full_name: staff.full_name, role: staff.role },
      redirectTo: inviteRedirectUrl(),
    });

  if (inviteError) {
    return json({ error: "Could not resend the invite" }, 500);
  }

  return json({ staff_id: staffId, email: authUser.user.email });
}

Deno.serve(async (req) => {
  const clients = await requireAdmin(req);
  if (clients instanceof Response) {
    return clients;
  }

  const body = await readJson(req);
  if (body instanceof Response) {
    return body;
  }

  const request = parseRequest(body);
  if (typeof request === "string") {
    return json({ error: request }, 400);
  }

  switch (request.action) {
    case "deactivate":
      return setActive(clients, request.staff_id, false);
    case "reactivate":
      return setActive(clients, request.staff_id, true);
    case "resend_invite":
      return resendInvite(clients, request.staff_id);
  }
});
