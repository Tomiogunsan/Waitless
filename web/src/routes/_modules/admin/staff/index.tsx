import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  BarChart3,
  Check,
  ClipboardList,
  MailCheck,
  Send,
  ShieldAlert,
  Stethoscope,
  UserCog,
  UserMinus,
  UserPlus,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import Avatar from "@/shared/avatar/avatar";
import Badge from "@/shared/badge/badge";
import Button from "@/shared/button/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/shared/dialog/dialog";
import Field from "@/shared/form-field/form-field";
import Input from "@/shared/input/input";
import Select from "@/shared/select/select";
import Alert from "@/shared/alert/alert";
import PageHeader from "@/shared/page-header/page-header";
import Segmented from "@/shared/segmented/segmented";
import { cn } from "@/utils/cn";
import { demoNow } from "@/utils/demo-clock";
import { isValidEmail, pluralize} from "@/utils/format";
import { requireRole } from "@/utils/guards";
import { isActive, isPhysicianFree } from "@/utils/scheduling";
import { formatDate } from "@/utils/time";
import { CURRENT_USER, departments, getDepartment } from "@/mocks/clinic";
import {
  appointmentStore,
  staffStore,
  useAppointments,
  useStaffList,
} from "@/mocks/store";
import type { ITableHead, ITableMenuOption } from "@/shared/table/interface";
import Table from "@/shared/table/table";
import TableEmptyState from "@/shared/table/table-empty-state";
import type { Staff, StaffRole } from "@/types/clinic";
import { ROLE_ICONS, ROLE_LABELS } from "@/helpers/user-role";

export const Route = createFileRoute("/_modules/admin/staff/")({
  beforeLoad: ({ context }) => requireRole(context.session, ["admin"]),
  component: StaffPage,
});

type RoleFilter = "all" | StaffRole;
type DialogState = { kind: "role" | "deactivate"; member: Staff } | null;



function StaffPage() {
  const members = useStaffList();
  const appointments = useAppointments();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);

  const activeCount = (id: string) =>
    appointments.filter((a) => a.physician_id === id && isActive(a)).length;

  // Search is handled by the table itself, across name and email.
  const visible = useMemo(
    () =>
      members
        .filter((m) => roleFilter === "all" || m.role === roleFilter)
        .sort(
          (a, b) =>
            Number(b.is_active) - Number(a.is_active) ||
            a.full_name.localeCompare(b.full_name),
        ),
    [members, roleFilter],
  );

  const count = (role: StaffRole) =>
    members.filter((m) => m.role === role).length;
  const pending = members.filter((m) => m.invite_pending && m.is_active).length;

  const resendInvite = (member: Staff) =>
    toast.success("Invite sent again", {
      description: `${member.email} has a new link to set their password.`,
    });

  const reactivate = (member: Staff) => {
    staffStore.update(member.id, { is_active: true });
    toast.success(`${member.full_name} reactivated`, {
      description: "They can sign in again.",
    });
  };

  const isMe = (member: Staff) => member.id === CURRENT_USER.admin;

  // You can't change your own account, so your row has no menu.
  const menuOptions: ITableMenuOption<Staff>[] = [
    {
      menuTitle: "Change role",
      icon: UserCog,
      action: (member) => setDialog({ kind: "role", member }),
      hide: (member) => isMe(member) || !member.is_active,
    },
    {
      menuTitle: "Resend invite",
      icon: MailCheck,
      action: resendInvite,
      hide: (member) =>
        isMe(member) || !member.is_active || !member.invite_pending,
    },
    {
      menuTitle: "Deactivate",
      icon: UserMinus,
      tone: "danger",
      separatorBefore: true,
      action: (member) => setDialog({ kind: "deactivate", member }),
      hide: (member) => isMe(member) || !member.is_active,
    },
    {
      menuTitle: "Reactivate",
      icon: UserRoundCheck,
      separatorBefore: true,
      action: reactivate,
      hide: (member) => isMe(member) || member.is_active,
    },
  ];

  const columns: ITableHead<Staff>[] = [
    {
      label: "Member",
      accessor: "full_name",
      render: (member) => (
        <div className="flex min-w-56 items-center gap-3">
          <Avatar
            name={member.full_name}
            size="md"
            className={cn(!member.is_active && "grayscale opacity-60")}
          />
          <div className="min-w-0">
            <p
              className={cn(
                "flex items-center gap-2 font-medium",
                member.is_active ? "text-slate-900" : "text-slate-500",
              )}
            >
              {member.full_name}
              {isMe(member) && <Badge tone="brand">You</Badge>}
            </p>
            <p className="truncate text-xs text-slate-500">{member.email}</p>
          </div>
        </div>
      ),
    },
    {
      label: "Role",
      accessor: "role",
      render: (member) => {
        const RoleIcon = ROLE_ICONS[member.role];
        return (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-700">
            <RoleIcon className="size-4 text-slate-400" aria-hidden />
            {ROLE_LABELS[member.role]}
          </span>
        );
      },
    },
    {
      label: "Department",
      accessor: "department_id",
      render: (member) => {
        const active = member.role === "physician" ? activeCount(member.id) : 0;
        return (
          <div className="whitespace-nowrap text-slate-600">
            {member.department_id ? (
              getDepartment(member.department_id)?.name
            ) : (
              <span className="text-slate-300">—</span>
            )}
            {active > 0 && (
              <span className="block text-xs text-slate-400">
                {pluralize(active, "active appointment")}
              </span>
            )}
          </div>
        );
      },
    },
    {
      label: "Status",
      accessor: "is_active",
      render: (member) =>
        !member.is_active ? (
          <Badge tone="neutral" icon={UserMinus}>
            Deactivated
          </Badge>
        ) : member.invite_pending ? (
          <Badge tone="warning" icon={Send}>
            Invite pending
          </Badge>
        ) : (
          <Badge tone="success" icon={Check}>
            Active
          </Badge>
        ),
    },
    {
      label: "Joined",
      accessor: "created_at",
      render: (member) => (
        <span className="whitespace-nowrap text-slate-500">
          {formatDate(member.created_at, "short")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description={`${pluralize(members.filter((m) => m.is_active).length, "active member")}${pending ? ` · ${pluralize(pending, "invite")} pending` : ""}`}
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus aria-hidden />
            Invite staff
          </Button>
        }
      />

      <Table<Staff>
        tableHeads={columns}
        dataTableSource={visible}
        showSearch
        searchPlaceholder="Search name or email"
        searchKeys={["full_name", "email"]}
        toolbar={
          <Segmented
            label="Filter by role"
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: "all", label: "Everyone", count: members.length },
              {
                value: "physician",
                label: "Physicians",
                count: count("physician"),
              },
              {
                value: "front_desk",
                label: "Front desk",
                count: count("front_desk"),
              },
              { value: "admin", label: "Admins", count: count("admin") },
            ]}
          />
        }
        showMenu
        menuOptions={menuOptions}
        rowLabel={(member) => member.full_name}
        rowClassName={(member) =>
          member.is_active ? undefined : "bg-slate-50/50"
        }
        tableEmptyState={
          <TableEmptyState
            variant="no-results"
            icon={UserCog}
            title="No staff match"
            description="Try another role or search term."
          />
        }
      />

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      {dialog?.kind === "role" && (
        <ChangeRoleDialog
          member={dialog.member}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "deactivate" && (
        <DeactivateDialog
          member={dialog.member}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

const ROLE_OPTIONS: { role: StaffRole; description: string }[] = [
  { role: "physician", description: "Sees their queue and writes visit notes" },
  { role: "front_desk", description: "Books, checks in and manages the day" },
  { role: "admin", description: "Manages staff and sees analytics" },
];

function RolePicker({
  value,
  onChange,
  disabled,
}: {
  value: StaffRole;
  onChange: (role: StaffRole) => void;
  disabled?: (role: StaffRole) => boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Role"
      className="grid gap-2 sm:grid-cols-3"
    >
      {ROLE_OPTIONS.map(({ role, description }) => {
        const Icon = ROLE_ICONS[role];
        const selected = role === value;
        return (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled?.(role)}
            onClick={() => onChange(role)}
            className={cn(
              "rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40",
              selected
                ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20"
                : "border-slate-200 hover:border-brand-300",
            )}
          >
            <Icon
              className={cn(
                "size-5",
                selected ? "text-brand-600" : "text-slate-400",
              )}
              aria-hidden
            />
            <span className="mt-2 block text-sm font-semibold text-slate-900">
              {ROLE_LABELS[role]}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-slate-500">
              {description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** invite-staff Edge Function. */
function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const members = useStaffList();
  const [values, setValues] = useState({
    email: "",
    fullName: "",
    role: "physician" as StaffRole,
    departmentId: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const taken = members.some(
    (m) => m.email === values.email.trim().toLowerCase(),
  );
  const errors = {
    email: !isValidEmail(values.email)
      ? "Enter a valid email address"
      : taken
        ? "Someone with this email is already on the team"
        : undefined,
    fullName: values.fullName.trim() ? undefined : "Enter their full name",
    department:
      values.role === "physician" && !values.departmentId
        ? "Physicians must belong to a department"
        : undefined,
  };

  const close = () => {
    setValues({ email: "", fullName: "", role: "physician", departmentId: "" });
    setSubmitted(false);
    onOpenChange(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    setSending(true);
    window.setTimeout(() => {
      staffStore.add({
        id: `stf-${crypto.randomUUID()}`,
        full_name: values.fullName.trim(),
        email: values.email.trim().toLowerCase(),
        role: values.role,
        department_id: values.role === "physician" ? values.departmentId : null,
        is_active: true,
        invite_pending: true,
        created_at: demoNow().toISOString(),
      });
      setSending(false);
      toast.success("Invite sent", {
        description: `${values.email.trim()} will get an email to set their password.${values.role === "physician" ? " Clinic hours were added automatically." : ""}`,
      });
      close();
    }, 700);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent
        size="lg"
        title="Invite a staff member"
        description="They'll get an email with a link to set their password."
      >
        <form noValidate onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
              error={submitted ? errors.fullName : undefined}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  value={values.fullName}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, fullName: e.target.value }))
                  }
                  placeholder="Dr. Yemi Ogunleye"
                />
              )}
            </Field>
            <Field
              label="Work email"
              error={submitted || taken ? errors.email : undefined}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  type="email"
                  value={values.email}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, email: e.target.value }))
                  }
                  placeholder="name@waitless.health"
                />
              )}
            </Field>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Role</p>
            <RolePicker
              value={values.role}
              onChange={(role) => setValues((v) => ({ ...v, role }))}
            />
          </div>
          {values.role === "physician" && (
            <Field
              label="Department"
              error={submitted ? errors.department : undefined}
              hint="Mon–Fri 08:40–17:00 working hours are set up automatically."
            >
              {(a11y) => (
                <Select
                  {...a11y}
                  value={values.departmentId}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, departmentId: e.target.value }))
                  }
                >
                  <option value="">Choose a department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={sending}>
              <Send aria-hidden />
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** change_staff_role(). */
function ChangeRoleDialog({
  member,
  onClose,
}: {
  member: Staff;
  onClose: () => void;
}) {
  const appointments = useAppointments();
  const [role, setRole] = useState(member.role);
  const [departmentId, setDepartmentId] = useState(member.department_id ?? "");
  const hasHistory =
    member.role === "physician" &&
    appointments.some((a) => a.physician_id === member.id);
  const unchanged =
    role === member.role &&
    (role !== "physician" || departmentId === member.department_id);

  const save = () => {
    staffStore.update(member.id, {
      role,
      department_id: role === "physician" ? departmentId : null,
    });
    toast.success(
      `${member.full_name} is now ${role === "admin" ? "an" : "a"} ${ROLE_LABELS[role].toLowerCase()}`,
    );
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent size="lg" title={`Change ${member.full_name}'s role`}>
        <div className="space-y-5">
          {hasHistory && (
            <Alert
              tone="info"
              icon={ShieldAlert}
              title="This physician has appointment history"
            >
              Clinical records must keep a physician, so they can only move
              department. To take them off clinical work, deactivate the
              account.
            </Alert>
          )}
          <RolePicker
            value={role}
            onChange={setRole}
            disabled={(r) => hasHistory && r !== "physician"}
          />
          {role === "physician" && (
            <Field label="Department">
              {(a11y) => (
                <Select
                  {...a11y}
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  <option value="">Choose a department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button
            onClick={save}
            disabled={unchanged || (role === "physician" && !departmentId)}
          >
            Save role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** manage-staff "deactivate", with reassign_physician_appointments() first when needed. */
function DeactivateDialog({
  member,
  onClose,
}: {
  member: Staff;
  onClose: () => void;
}) {
  const appointments = useAppointments();
  const [result, setResult] = useState<{
    moved: number;
    flagged: number;
  } | null>(null);
  const blocking = appointments.filter(
    (a) => a.physician_id === member.id && isActive(a),
  );
  const department = member.department_id
    ? getDepartment(member.department_id)?.name
    : undefined;

  // Same rule as the database: move what a free colleague can take, flag the rest for the front desk.
  const reassignAll = () => {
    let moved = 0;
    let flagged = 0;
    const colleagues = staffStore
      .getAll()
      .filter(
        (s) =>
          s.role === "physician" &&
          s.is_active &&
          s.id !== member.id &&
          s.department_id === member.department_id,
      );
    for (const a of blocking.filter((x) => x.status !== "in_progress")) {
      const target = colleagues.find((c) =>
        isPhysicianFree(appointmentStore.getAll(), c.id, a.scheduled_at, a.id),
      );
      if (target) {
        appointmentStore.update(a.id, {
          physician_id: target.id,
          reschedule_needs_review: false,
          reschedule_review_reason: null,
        });
        moved++;
      } else {
        appointmentStore.update(a.id, {
          reschedule_needs_review: true,
          reschedule_review_reason:
            "Physician unavailable and no other physician in the department is free at this time.",
        });
        flagged++;
      }
    }
    setResult({ moved, flagged });
  };

  const deactivate = () => {
    staffStore.update(member.id, { is_active: false });
    toast(`${member.full_name} deactivated`, {
      description: "Their access ends immediately and they can't sign in.",
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        size="sm"
        title={`Deactivate ${member.full_name}?`}
        description="They lose access straight away. Their records are kept and you can reactivate them later."
      >
        <div className="space-y-4">
          {result && (
            <Alert
              tone={result.flagged ? "warning" : "success"}
              icon={result.flagged ? ShieldAlert : Check}
              title={`${result.moved} moved to colleagues, ${result.flagged} flagged for review`}
            >
              {result.flagged > 0 &&
                "No colleague is free at those times. The front desk needs to reschedule or cancel them first."}
            </Alert>
          )}
          {blocking.length > 0 ? (
            <>
              {!result && (
                <Alert
                  tone="warning"
                  icon={ArrowRightLeft}
                  title={`${pluralize(blocking.length, "active appointment")} still assigned`}
                >
                  Move them to free colleagues
                  {department ? ` in ${department}` : ""} before deactivating.
                </Alert>
              )}
              {!result && (
                <Button variant="soft" className="w-full" onClick={reassignAll}>
                  <ArrowRightLeft aria-hidden />
                  Reassign appointments
                </Button>
              )}
            </>
          ) : (
            !result && (
              <p className="text-sm text-slate-600">
                Nothing is assigned to them, so they can be deactivated now.
              </p>
            )
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button
            variant="danger"
            onClick={deactivate}
            disabled={blocking.length > 0}
          >
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
