import { Mail, Phone } from "lucide-react";
import Avatar from "@/shared/avatar/avatar";
import { Card } from "@/shared/card/card";
import type { PatientRecord } from "@/types/patient";
import { formatPhone } from "@/utils/format";
import { formatDate } from "@/utils/time";
import { EditContactDialog } from "./edit-contact-dialog";

export function ProfileCard({
  patient,
  canEdit,
}: {
  patient: PatientRecord;
  canEdit: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div
        className="h-20 bg-linear-to-r from-brand-600 to-brand-500"
        aria-hidden
      />
      <div className="flex flex-col gap-4 px-6 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar
            name={patient.fullName}
            size="lg"
            className="-mt-7 ring-4 ring-white"
          />
          <div className="pt-3">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {patient.fullName}
            </h1>
            <p className="text-sm text-slate-500">
              Patient since {formatDate(patient.createdAt, "short")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
          <span className="tabular inline-flex items-center gap-1.5">
            <Phone className="size-4 text-slate-400" aria-hidden />
            {formatPhone(patient.phone)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Mail className="size-4 text-slate-400" aria-hidden />
            {patient.email ?? "No email"}
          </span>
          {canEdit && <EditContactDialog patient={patient} />}
        </div>
      </div>
    </Card>
  );
}
