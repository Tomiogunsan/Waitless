// Invite a staff member by email and assign their role.


import { inviteRedirectUrl, readJson, requireAdmin } from "../_shared/admin.ts";
import { json } from "../_shared/http.ts";

const STAFF_ROLES = ["physician", "front_desk", "admin"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

interface InviteRequest {
  email: string;
  full_name: string;
  role: StaffRole;
  department_id: string | null;
}

// Check the request body and return a clean invite, or an error message.
function parseInvite(body: unknown): InviteRequest | string {
  if (typeof body !== "object" || body === null) {
    return "Request body must be a JSON object";
  }

  const { email, full_name, role, department_id } = body as Record<
    string,
    unknown
  >;

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "A valid email is required";
  }

  if (typeof full_name !== "string" || full_name.trim().length === 0) {
    return "Full name is required";
  }

  if (typeof role !== "string" || !STAFF_ROLES.includes(role as StaffRole)) {
    return `Role must be one of: ${STAFF_ROLES.join(", ")}`;
  }

  if (role === "physician") {
    if (typeof department_id !== "string" || department_id.length === 0) {
      return "Physicians must be assigned a department";
    }
  } else if (department_id !== undefined && department_id !== null) {
    return "Only physicians belong to a department";
  }

  return {
    email: email.trim().toLowerCase(),
    full_name: full_name.trim(),
    role: role as StaffRole,
    department_id: role === "physician" ? (department_id as string) : null,
  };
}

Deno.serve(async (req) => {
  const clients = await requireAdmin(req);
  if (clients instanceof Response) {
    return clients;
  }
  const { serviceClient } = clients;

  const body = await readJson(req);
  if (body instanceof Response) {
    return body;
  }

  const invite = parseInvite(body);
  if (typeof invite === "string") {
    return json({ error: invite }, 400);
  }

  if (invite.department_id) {
    const { data: department } = await serviceClient
      .from("departments")
      .select("id")
      .eq("id", invite.department_id)
      .maybeSingle();

    if (!department) {
      return json({ error: "Department not found" }, 400);
    }
  }

  const { data: invited, error: inviteError } = await serviceClient.auth.admin
    .inviteUserByEmail(invite.email, {
      data: { full_name: invite.full_name, role: invite.role },
      redirectTo: inviteRedirectUrl(),
    });

  if (inviteError || !invited?.user) {
    const alreadyRegistered = inviteError?.message
      ?.toLowerCase()
      .includes("already been registered");

    return json(
      {
        error: alreadyRegistered
          ? "A user with this email already exists"
          : "Could not send the invite",
      },
      alreadyRegistered ? 409 : 500,
    );
  }

  const { data: staff, error: staffError } = await serviceClient
    .from("staff")
    .insert({
      id: invited.user.id,
      full_name: invite.full_name,
      role: invite.role,
      department_id: invite.department_id,
    })
    .select("id, full_name, role, department_id")
    .single();

  if (staffError) {
    // Undo the invite so the email cannot be used without a staff record.
    await serviceClient.auth.admin.deleteUser(invited.user.id);
    return json({ error: "Could not create the staff record" }, 500);
  }

  return json({ staff: { ...staff, email: invite.email } }, 201);
});
