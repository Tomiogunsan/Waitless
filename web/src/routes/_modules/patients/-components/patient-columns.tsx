import Avatar from "@/shared/avatar/avatar";
import type { ITableHead } from "@/shared/table/interface";
import type { PatientDirectoryRow } from "@/types/patient";
import { formatPhone } from "@/utils/format";
import { isOnDate } from "@/utils/scheduling";
import { clinicToday, formatDate } from "@/utils/time";

export const PATIENT_COLUMNS: ITableHead<PatientDirectoryRow>[] = [
  {
    label: "Patient",
    accessor: "fullName",
    sticky: true,
    stickyTo: "left",
    render: (patient) => (
      <div className="flex min-w-48 items-center gap-3">
        <Avatar name={patient.fullName} size="md" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">
            {patient.fullName}
          </p>
          <p className="tabular truncate text-xs text-slate-500">
            {formatPhone(patient.phone)}
          </p>
        </div>
      </div>
    ),
  },
  {
    label: "Email",
    accessor: "email",
    render: (patient) =>
      patient.email ?? <span className="text-slate-400">None</span>,
  },
  {
    label: "Last visit",
    accessor: "lastVisitAt",
    render: (patient) =>
      patient.lastVisitAt ? (
        formatDate(patient.lastVisitAt, "short")
      ) : (
        <span className="text-slate-400">None yet</span>
      ),
  },
  {
    label: "Next appointment",
    accessor: "nextAppointmentAt",
    render: (patient) =>
      patient.nextAppointmentAt ? (
        <span className="font-medium text-brand-700">
          {isOnDate(patient.nextAppointmentAt, clinicToday())
            ? "Today"
            : formatDate(patient.nextAppointmentAt, "short")}
        </span>
      ) : (
        <span className="text-slate-400">None booked</span>
      ),
  },
  {
    label: "Registered",
    accessor: "createdAt",
    align: "right",
    render: (patient) => (
      <span className="text-slate-500">
        {formatDate(patient.createdAt, "short")}
      </span>
    ),
  },
];
