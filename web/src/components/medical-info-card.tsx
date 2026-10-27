import { AlertOctagon, FileText, HelpCircle, ShieldCheck } from "lucide-react";
import Alert from "@/shared/alert/alert";
import type { PatientMedicalInfo } from "@/types/clinic";

/** Allergies shown prominently, as the user stories ask for physicians. */
export function MedicalInfoCard({ info }: { info: PatientMedicalInfo }) {
  const unknown = info.allergies === "Unknown";
  const none = info.allergies === "None known";

  return (
    <div className="space-y-3">
      {unknown ? (
        <Alert tone="warning" icon={HelpCircle} title="Allergies not yet recorded">
          Ask the patient about allergies before prescribing.
        </Alert>
      ) : none ? (
        <Alert tone="success" icon={ShieldCheck} title="No known allergies" />
      ) : (
        <Alert tone="danger" icon={AlertOctagon} title={`Allergies: ${info.allergies}`}>
          Check before prescribing.
        </Alert>
      )}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <FileText className="size-3.5" aria-hidden />
          Medical history
        </p>
        <p className="mt-1 text-sm text-slate-800">{info.medical_history ?? "Nothing recorded yet."}</p>
      </div>
    </div>
  );
}
