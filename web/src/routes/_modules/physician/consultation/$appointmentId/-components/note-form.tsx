import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Clock, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import Alert from "@/shared/alert/alert";
import Button from "@/shared/button/button";
import { Card, CardBody, CardHeader } from "@/shared/card/card";
import Field from "@/shared/form-field/form-field";
import Textarea from "@/shared/textarea/textarea";
import { useSaveVisitNote, useVisitNote } from "@/hooks/use-consultation";
import type { StaffAppointment } from "@/types/appointment";
import type { VisitNote } from "@/types/consultation";
import { cn } from "@/utils/cn";
import { formatTime } from "@/utils/time";
import { CompleteDialog } from "./complete-dialog";

export function NoteForm({ appointment }: { appointment: StaffAppointment }) {
  const { data: saved, isPending } = useVisitNote(appointment.id);
  if (isPending) {
    return <Card className="h-80 animate-pulse" aria-label="Loading visit note" />;
  }
  return <NoteEditor appointment={appointment} saved={saved ?? null} />;
}

function NoteEditor({
  appointment,
  saved,
}: {
  appointment: StaffAppointment;
  saved: VisitNote | null;
}) {
  const navigate = useNavigate();
  const { mutate: saveNote, isPending: saving, error } = useSaveVisitNote();
  const readOnly = appointment.status === "completed";
  const [values, setValues] = useState({
    symptoms: saved?.symptoms ?? "",
    diagnosis: saved?.diagnosis ?? "",
    prescription: saved?.prescription ?? "",
  });
  const [submitted, setSubmitted] = useState(false);

  const dirty =
    values.symptoms !== (saved?.symptoms ?? "") ||
    values.diagnosis !== (saved?.diagnosis ?? "") ||
    values.prescription !== (saved?.prescription ?? "");
  const errors = {
    symptoms: values.symptoms.trim() ? undefined : "Describe the symptoms",
    diagnosis: values.diagnosis.trim() ? undefined : "Add a diagnosis",
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (errors.symptoms || errors.diagnosis) return;
    const fields = {
      symptoms: values.symptoms.trim(),
      diagnosis: values.diagnosis.trim(),
      prescription: values.prescription.trim(),
    };
    saveNote(
      { appointmentId: appointment.id, ...fields },
      {
        onSuccess: () => {
          setValues(fields);
          toast.success("Visit note saved");
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader
        title="Visit note"
        description={
          readOnly
            ? "This consultation is complete. The note can no longer be changed."
            : "Symptoms and diagnosis are required before you can complete."
        }
        actions={
          saved && !readOnly ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium",
                dirty ? "text-amber-700" : "text-emerald-700",
              )}
              aria-live="polite"
            >
              {dirty ? (
                <Clock className="size-3.5" aria-hidden />
              ) : (
                <CheckCircle2 className="size-3.5" aria-hidden />
              )}
              {dirty ? "Unsaved changes" : `Saved ${formatTime(saved.updatedAt)}`}
            </span>
          ) : null
        }
      />
      <CardBody>
        <form noValidate onSubmit={save} className="space-y-5">
          <Field
            label="Symptoms"
            error={submitted ? errors.symptoms : undefined}
          >
            {(a11y) => (
              <Textarea
                {...a11y}
                readOnly={readOnly}
                value={values.symptoms}
                onChange={(e) =>
                  setValues((v) => ({ ...v, symptoms: e.target.value }))
                }
                placeholder="What the patient describes, how long, and any relevant findings"
              />
            )}
          </Field>
          <Field
            label="Diagnosis"
            error={submitted ? errors.diagnosis : undefined}
          >
            {(a11y) => (
              <Textarea
                {...a11y}
                readOnly={readOnly}
                value={values.diagnosis}
                onChange={(e) =>
                  setValues((v) => ({ ...v, diagnosis: e.target.value }))
                }
                className="min-h-16"
                placeholder="e.g. Viral upper respiratory tract infection"
              />
            )}
          </Field>
          <Field label="Prescription" optional>
            {(a11y) => (
              <Textarea
                {...a11y}
                readOnly={readOnly}
                value={values.prescription}
                onChange={(e) =>
                  setValues((v) => ({ ...v, prescription: e.target.value }))
                }
                className="min-h-16"
                placeholder="Medication, dose and duration"
              />
            )}
          </Field>

          {error && (
            <Alert tone="danger" icon={AlertTriangle} title={error.message} />
          )}

          {!readOnly && (
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Button
                type="submit"
                variant="secondary"
                loading={saving}
                disabled={Boolean(saved) && !dirty}
              >
                <Save aria-hidden />
                Save note
              </Button>
              <CompleteDialog
                appointment={appointment}
                canComplete={Boolean(saved) && !dirty}
                onCompleted={() => void navigate({ to: "/physician" })}
              />
            </div>
          )}
        </form>
      </CardBody>
    </Card>
  );
}
