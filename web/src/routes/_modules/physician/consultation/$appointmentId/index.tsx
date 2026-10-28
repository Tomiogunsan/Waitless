import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileQuestion,
  History,
  Lock,
  PlayCircle,
  Save,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/shared/badge/appointment-status-badge";
import { MedicalInfoCard } from "@/routes/_modules/physician/-components/medical-info-card";
import Avatar from "@/shared/avatar/avatar";
import Button from "@/shared/button/button";
import { buttonStyles } from "@/shared/button/button-styles";
import { Card, CardBody, CardHeader } from "@/shared/card/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/shared/dialog/dialog";
import Field from "@/shared/form-field/form-field";
import Textarea from "@/shared/textarea/textarea";
import Alert from "@/shared/alert/alert";
import EmptyState from "@/shared/empty-state/empty-state";
import { cn } from "@/utils/cn";
import { DEMO_TODAY, useDemoNow } from "@/utils/demo-clock";
import { formatPhone, pluralize } from "@/utils/format";
import { requireRole } from "@/utils/guards";
import { useMockStaffId } from "@/utils/session";
import { isOnDate } from "@/utils/scheduling";
import {
  APPOINTMENT_MINUTES,
  atClinicTime,
  formatDate,
  formatDuration,
  formatTime,
  minutesBetween,
} from "@/utils/time";
import { getMedicalInfo, getStaff } from "@/mocks/clinic";
import {
  appointmentStore,
  noteStore,
  patientStore,
  useAppointments,
  useVisitNotes,
} from "@/mocks/store";
import type { Appointment } from "@/types/clinic";

export const Route = createFileRoute(
  "/_modules/physician/consultation/$appointmentId/",
)({
  beforeLoad: ({ context }) => requireRole(context.session, ["physician"]),
  loader: ({ params }) => {
    if (!appointmentStore.get(params.appointmentId)) throw notFound();
  },
  component: ConsultationPage,
  notFoundComponent: () => (
    <EmptyState icon={FileQuestion} title="Appointment not found" />
  ),
});


function ConsultationPage() {
  const ME = useMockStaffId()!;
  const { appointmentId } = Route.useParams();
  const appointment = useAppointments().find((a) => a.id === appointmentId)!;
  const patient = patientStore.get(appointment.patient_id)!;
  const medical = getMedicalInfo(patient.id);

  if (appointment.physician_id !== ME) {
    return (
      <EmptyState
        icon={Lock}
        title="This appointment isn't assigned to you"
        description="Only the assigned physician can run a consultation."
        action={
          <Link to="/physician" className={buttonStyles()}>
            Back to my queue
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/physician"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        My queue
      </Link>

      <ConsultationHeader appointment={appointment} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {appointment.status === "checked_in" && (
            <StartPanel appointment={appointment} />
          )}
          {(appointment.status === "in_progress" ||
            appointment.status === "completed") && (
            <NoteForm appointment={appointment} key={appointment.status} />
          )}
        </div>

        <aside className="space-y-6">
          {medical && <MedicalInfoCard info={medical} />}
          <Card>
            <CardHeader title="Contact" />
            <CardBody className="space-y-1 text-sm text-slate-600">
              <p className="tabular">{formatPhone(patient.phone)}</p>
              <p>{patient.email ?? "No email on file"}</p>
            </CardBody>
          </Card>
          <PreviousVisits
            patientId={patient.id}
            currentAppointmentId={appointment.id}
          />
        </aside>
      </div>
    </div>
  );
}

function ConsultationHeader({ appointment }: { appointment: Appointment }) {
  const now = useDemoNow(1000);
  const patient = patientStore.get(appointment.patient_id)!;
  const running =
    appointment.status === "in_progress" && appointment.actual_started_at;
  const seconds = running
    ? Math.max(
        0,
        Math.floor(
          (now.getTime() - new Date(appointment.actual_started_at!).getTime()) /
            1000,
        ),
      )
    : 0;
  const minutes = seconds / 60;
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-5 p-5">
      <div className="flex items-center gap-4">
        <Avatar name={patient.full_name} size="lg" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {patient.full_name}
            </h1>
            <StatusBadge status={appointment.status} />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Booked {formatTime(appointment.scheduled_at)}
            {appointment.checked_in_at &&
              ` · arrived ${formatTime(appointment.checked_in_at)}`}{" "}
            · <span className="font-mono">{appointment.reference_code}</span>
          </p>
        </div>
      </div>

      {running && (
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p
              className={cn(
                "tabular text-3xl font-semibold tracking-tight",
                minutes > 40
                  ? "text-red-600"
                  : minutes > 35
                    ? "text-amber-600"
                    : "text-slate-900",
              )}
              aria-live="off"
            >
              {clock}
            </p>
            <p className="text-xs text-slate-500">
              {minutes > 35
                ? "Over the 35-minute slot"
                : `${Math.ceil(35 - minutes)} min left with patient`}
            </p>
          </div>
          <ProgressRing value={Math.min(1, minutes / 35)} warn={minutes > 35} />
        </div>
      )}
    </Card>
  );
}

function ProgressRing({ value, warn }: { value: number; warn: boolean }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 52 52" className="size-14 -rotate-90" aria-hidden>
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        strokeWidth="5"
        className="stroke-slate-100"
      />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        className={cn(
          "transition-[stroke-dashoffset] duration-1000",
          warn ? "stroke-amber-500" : "stroke-brand-600",
        )}
      />
    </svg>
  );
}

function StartPanel({ appointment }: { appointment: Appointment }) {
  const ME = useMockStaffId()!;
  const now = useDemoNow();
  const busy = useAppointments().some(
    (a) => a.physician_id === ME && a.status === "in_progress",
  );
  return (
    <Card className="p-8 text-center">
      <PlayCircle className="mx-auto size-10 text-brand-600" aria-hidden />
      <h2 className="mt-3 text-lg font-semibold text-slate-900">
        Ready when you are
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {patientStore.get(appointment.patient_id)?.full_name} has been waiting{" "}
        {formatDuration(minutesBetween(appointment.checked_in_at!, now))}.
      </p>
      <Button
        className="mt-6"
        disabled={busy}
        onClick={() =>
          appointmentStore.update(appointment.id, {
            status: "in_progress",
            actual_started_at: now.toISOString(),
          })
        }
      >
        Start consultation
      </Button>
      {busy && (
        <p className="mt-2 text-xs text-slate-500">
          Complete your current consultation first.
        </p>
      )}
    </Card>
  );
}

function NoteForm({ appointment }: { appointment: Appointment }) {
  const ME = useMockStaffId()!;
  const navigate = useNavigate();
  const notes = useVisitNotes();
  const saved = notes.find((n) => n.appointment_id === appointment.id);
  const readOnly = appointment.status === "completed";
  const [values, setValues] = useState({
    symptoms: saved?.symptoms ?? "",
    diagnosis: saved?.diagnosis ?? "",
    prescription: saved?.prescription ?? "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    window.setTimeout(() => {
      const now = new Date().toISOString();
      const fields = {
        symptoms: values.symptoms.trim(),
        diagnosis: values.diagnosis.trim(),
        prescription: values.prescription.trim() || null,
      };
      if (saved) noteStore.update(saved.id, { ...fields, updated_at: now });
      else
        noteStore.add({
          id: `note-${crypto.randomUUID()}`,
          appointment_id: appointment.id,
          physician_id: ME,
          created_at: now,
          updated_at: now,
          ...fields,
        });
      setSaving(false);
      toast.success("Visit note saved");
    }, 400);
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
              {dirty
                ? "Unsaved changes"
                : `Saved ${formatTime(saved.updated_at)}`}
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

          {!readOnly && (
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Button
                type="submit"
                variant="secondary"
                loading={saving}
                disabled={saved && !dirty}
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

function CompleteDialog({
  appointment,
  canComplete,
  onCompleted,
}: {
  appointment: Appointment;
  canComplete: boolean;
  onCompleted: () => void;
}) {
  const ME = useMockStaffId()!;
  const now = useDemoNow();
  const all = useAppointments();
  const [open, setOpen] = useState(false);
  const endOfSlot = new Date(
    new Date(appointment.scheduled_at).getTime() + APPOINTMENT_MINUTES * 60_000,
  );
  const overrun = Math.max(0, minutesBetween(endOfSlot, now));
  const later = all.filter(
    (a) =>
      a.physician_id === ME &&
      a.status === "scheduled" &&
      isOnDate(a.scheduled_at, DEMO_TODAY) &&
      a.scheduled_at > appointment.scheduled_at,
  );
  const closing = atClinicTime(DEMO_TODAY, "17:00").getTime();

  // Mirrors complete_consultation(): move everyone by the delay, or flag them all if any wouldn't fit.
  const confirm = () => {
    appointmentStore.update(appointment.id, {
      status: "completed",
      actual_ended_at: now.toISOString(),
    });
    let summary = "Your queue is up to date.";
    if (overrun > 0 && later.length) {
      const shift = overrun * 60_000;
      const unsafe = later.some(
        (a) =>
          a.reschedule_needs_review ||
          new Date(a.scheduled_at).getTime() +
            shift +
            APPOINTMENT_MINUTES * 60_000 >
            closing,
      );
      for (const a of later) {
        if (unsafe) {
          appointmentStore.update(a.id, {
            reschedule_needs_review: true,
            reschedule_review_reason:
              "Consultation delay requires staff review.",
          });
        } else {
          appointmentStore.update(a.id, {
            scheduled_at: new Date(
              new Date(a.scheduled_at).getTime() + shift,
            ).toISOString(),
          });
        }
      }
      summary = unsafe
        ? `${pluralize(later.length, "later appointment")} flagged for the front desk to review.`
        : `${pluralize(later.length, "later appointment")} moved back by ${formatDuration(overrun)}.`;
    }
    toast.success("Consultation completed", { description: summary });
    setOpen(false);
    onCompleted();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        onClick={() => setOpen(true)}
        disabled={!canComplete}
        title={canComplete ? undefined : "Save the visit note first"}
      >
        <CheckCircle2 aria-hidden />
        Complete consultation
      </Button>
      <DialogContent
        size="sm"
        title="Complete this consultation?"
        description="The patient leaves your queue and the front desk sees the visit as completed."
      >
        {overrun > 0 && later.length > 0 ? (
          <Alert
            tone="info"
            icon={Clock}
            title={`You ran ${formatDuration(overrun)} over`}
          >
            Your {pluralize(later.length, "later appointment")} today will move
            back by {formatDuration(overrun)} where possible, so no one is
            double-booked.
          </Alert>
        ) : (
          <p className="text-sm text-slate-600">
            You finished on time. Nothing else changes.
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Not yet</Button>
          </DialogClose>
          <Button onClick={confirm}>Complete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviousVisits({
  patientId,
  currentAppointmentId,
}: {
  patientId: string;
  currentAppointmentId: string;
}) {
  const all = useAppointments();
  const notes = useVisitNotes();
  const visits = all
    .filter(
      (a) =>
        a.patient_id === patientId &&
        a.id !== currentAppointmentId &&
        a.status === "completed",
    )
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
    .map((a) => ({
      appointment: a,
      note: notes.find((n) => n.appointment_id === a.id),
    }))
    .filter((v) => v.note);

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <History className="size-4 text-brand-600" aria-hidden />
            Previous visits
          </span>
        }
      />
      <CardBody>
        {visits.length === 0 ? (
          <p className="text-sm text-slate-500">
            This is the patient's first visit.
          </p>
        ) : (
          <ul className="space-y-3">
            {visits.map(({ appointment: a, note }) => (
              <li key={a.id}>
                <details className="group rounded-xl border border-slate-200/80 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-start justify-between gap-2 rounded-xl p-3 hover:bg-slate-50">
                    <span>
                      <span className="block text-sm font-medium text-slate-900">
                        {note!.diagnosis}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {formatDate(a.scheduled_at, "short")} ·{" "}
                        {getStaff(a.physician_id)?.full_name}
                      </span>
                    </span>
                    <span className="mt-1 text-xs text-brand-600 group-open:hidden">
                      Show
                    </span>
                    <span className="mt-1 hidden text-xs text-brand-600 group-open:inline">
                      Hide
                    </span>
                  </summary>
                  <dl className="space-y-2 border-t border-slate-100 p-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">Symptoms</dt>
                      <dd className="text-slate-800">{note!.symptoms}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Prescription</dt>
                      <dd className="text-slate-800">
                        {note!.prescription ?? "None"}
                      </dd>
                    </div>
                  </dl>
                </details>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
