import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  MailCheck,
  UserCog,
  UserMinus,
  UserPlus,
  UserRoundCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Alert from "@/shared/alert/alert";
import Button from "@/shared/button/button";
import PageHeader from "@/shared/page-header/page-header";
import Segmented from "@/shared/segmented/segmented";
import type { ITableMenuOption } from "@/shared/table/interface";
import Table from "@/shared/table/table";
import TableEmptyState from "@/shared/table/table-empty-state";
import { useDepartments } from "@/hooks/use-booking";
import {
  useActiveAppointmentCounts,
  useResendInvite,
  useSetStaffActive,
  useStaffDirectory,
} from "@/hooks/use-staff";
import type { StaffRole } from "@/types/clinic";
import type { StaffMember } from "@/types/staff";
import { pluralize } from "@/utils/format";
import { requireRole } from "@/utils/guards";
import { useCurrentUser } from "@/utils/session";
import { ChangeRoleDialog } from "./-components/change-role-dialog";
import { DeactivateDialog } from "./-components/deactivate-dialog";
import { InviteDialog } from "./-components/invite-dialog";
import { staffColumns } from "./-components/staff-columns";
import type { RoleFilter, StaffDialogState } from "./-constants/staff";

export const Route = createFileRoute("/_modules/admin/staff/")({
  beforeLoad: ({ context }) => requireRole(context.session, ["admin"]),
  component: StaffPage,
});

function StaffPage() {
  const myId = useCurrentUser()?.id;
  const { data: members = [], isPending, isError } = useStaffDirectory();
  const { data: activeCounts = {} } = useActiveAppointmentCounts();
  const { data: departments = [] } = useDepartments();
  const { mutate: resendInvite } = useResendInvite();
  const { mutate: setActive } = useSetStaffActive();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [dialog, setDialog] = useState<StaffDialogState>(null);

  // Search is handled by the table itself, across name and email.
  const visible = useMemo(
    () =>
      members
        .filter((m) => roleFilter === "all" || m.role === roleFilter)
        .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.fullName.localeCompare(b.fullName)),
    [members, roleFilter],
  );

  const count = (role: StaffRole) => members.filter((m) => m.role === role).length;
  const pending = members.filter((m) => m.invitePending && m.isActive).length;
  const isMe = (member: StaffMember) => member.id === myId;

  const handleResend = (member: StaffMember) =>
    resendInvite(member.id, {
      onSuccess: () =>
        toast.success("Invite sent again", {
          description: `${member.email} has a new link to set their password.`,
        }),
      onError: (err) => toast.error(err.message),
    });

  const handleReactivate = (member: StaffMember) =>
    setActive(
      { staffId: member.id, active: true },
      {
        onSuccess: () =>
          toast.success(`${member.fullName} reactivated`, { description: "They can sign in again." }),
        onError: (err) => toast.error(err.message),
      },
    );


  const menuOptions: ITableMenuOption<StaffMember>[] = [
    {
      menuTitle: "Change role",
      icon: UserCog,
      action: (member) => setDialog({ kind: "role", member }),
      hide: (member) => isMe(member) || !member.isActive,
    },
    {
      menuTitle: "Resend invite",
      icon: MailCheck,
      action: handleResend,
      hide: (member) => isMe(member) || !member.isActive || !member.invitePending,
    },
    {
      menuTitle: "Deactivate",
      icon: UserMinus,
      tone: "danger",
      separatorBefore: true,
      action: (member) => setDialog({ kind: "deactivate", member }),
      hide: (member) => isMe(member) || !member.isActive,
    },
    {
      menuTitle: "Reactivate",
      icon: UserRoundCheck,
      separatorBefore: true,
      action: handleReactivate,
      hide: (member) => isMe(member) || member.isActive,
    },
  ];

  const columns = staffColumns({
    myId,
    activeCounts,
    departmentName: (id) => departments.find((d) => d.id === id)?.name,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description={`${pluralize(members.filter((m) => m.isActive).length, "active member")}${pending ? ` · ${pluralize(pending, "invite")} pending` : ""}`}
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus aria-hidden />
            Invite staff
          </Button>
        }
      />

      {isError && (
        <Alert tone="danger" icon={AlertTriangle} title="We couldn't load the staff list. Refresh to try again." />
      )}

      <Table<StaffMember>
        tableHeads={columns}
        dataTableSource={visible}
        loading={isPending}
        showSearch
        searchPlaceholder="Search name or email"
        searchKeys={["fullName", "email"]}
        toolbar={
          <Segmented
            label="Filter by role"
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: "all", label: "Everyone", count: members.length },
              { value: "physician", label: "Physicians", count: count("physician") },
              { value: "front_desk", label: "Front desk", count: count("front_desk") },
              { value: "admin", label: "Admins", count: count("admin") },
            ]}
          />
        }
        showMenu
        menuOptions={menuOptions}
        rowLabel={(member) => member.fullName}
        rowClassName={(member) => (member.isActive ? undefined : "bg-slate-50/50")}
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
        <ChangeRoleDialog member={dialog.member} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "deactivate" && (
        <DeactivateDialog member={dialog.member} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
