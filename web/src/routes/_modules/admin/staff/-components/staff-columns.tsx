import { Check, Send, UserMinus } from "lucide-react";
import Avatar from "@/shared/avatar/avatar";
import Badge from "@/shared/badge/badge";
import type { ITableHead } from "@/shared/table/interface";
import { ROLE_ICONS, ROLE_LABELS } from "@/helpers/user-role";
import type { StaffMember } from "@/types/staff";
import { cn } from "@/utils/cn";
import { pluralize } from "@/utils/format";
import { formatDate } from "@/utils/time";

export function staffColumns({
  myId,
  activeCounts,
  departmentName,
}: {
  myId: string | undefined;
  activeCounts: Record<string, number>;
  departmentName: (id: string) => string | undefined;
}): ITableHead<StaffMember>[] {
  return [
    {
      label: "Member",
      accessor: "fullName",
      render: (member) => (
        <div className="flex min-w-56 items-center gap-3">
          <Avatar
            name={member.fullName}
            size="md"
            className={cn(!member.isActive && "grayscale opacity-60")}
          />
          <div className="min-w-0">
            <p
              className={cn(
                "flex items-center gap-2 font-medium",
                member.isActive ? "text-slate-900" : "text-slate-500",
              )}
            >
              {member.fullName}
              {member.id === myId && <Badge tone="brand">You</Badge>}
              {member.isDemoAccount && member.id !== myId && (
                <Badge tone="neutral" title="Shared demo login: it can't be changed">Demo</Badge>
              )}
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
      accessor: "departmentId",
      render: (member) => {
        const active = activeCounts[member.id] ?? 0;
        return (
          <div className="whitespace-nowrap text-slate-600">
            {member.departmentId ? (
              departmentName(member.departmentId)
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
      accessor: "isActive",
      render: (member) =>
        !member.isActive ? (
          <Badge tone="neutral" icon={UserMinus}>
            Deactivated
          </Badge>
        ) : member.invitePending ? (
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
      accessor: "createdAt",
      render: (member) => (
        <span className="whitespace-nowrap text-slate-500">
          {formatDate(member.createdAt, "short")}
        </span>
      ),
    },
  ];
}
