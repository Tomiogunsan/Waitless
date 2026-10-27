import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Lock,
  Mail,
  Pencil,
  Phone,
  UserX,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/appointment-status";
import { MedicalInfoCard } from "@/components/medical-info-card";
import Avatar from "@/shared/avatar/avatar";
import Button from "@/shared/button/button";
import { Card, CardBody, CardHeader } from "@/shared/card/card";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/shared/dialog/dialog";
import Field from "@/shared/form-field/form-field";
import Input from "@/shared/input/input";
import EmptyState from "@/shared/empty-state/empty-state";
import { DEMO_TODAY } from "@/lib/demo-clock";
import { formatPhone, isValidEmail, isValidPhone, normalizePhone } from "@/lib/format";
import { requireRole } from "@/lib/guards";
import { useRole } from "@/lib/session";
import { formatDate, formatTime } from "@/lib/time";
import { getDepartment, getMedicalInfo, getStaff } from "@/mocks/clinic";
import { patientStore, useAppointments, usePatients, useVisitNotes } from "@/mocks/store";
import type { Patient } from "@/types/clinic";

export const Route = createFileRoute("/_staff/patients/$patientId/")({
  beforeLoad: ({ context }) => requireRole(context.session, ["front_desk", "physician", "admin"]),
  loader: ({ params }) => {
    if (!patientStore.get(params.patientId)) throw notFound();
  },
  component: PatientProfilePage,
  notFoundComponent: () => (
    <EmptyState icon={UserX} title="Patient not found" description="This record may have been removed, or the link is wrong." />
  ),
});

function PatientProfilePage() {
  const { patientId } = Route.useParams();
  const role = useRole();
  const patients = usePatients();
  const appointments = useAppointments();
  const notes = useVisitNotes();
  const patient = patients.find((p) => p.id === patientId)!;
  const isPhysician = role === "physician";
  const medical = getMedicalInfo(patientId);

  const theirs = appointments.filter((a) => a.patient_id === patientId).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  const todayStart = new Date(`${DEMO_TODAY}T00:00:00+01:00`).toISOString();
  const upcoming = theirs.filter((a) => ["scheduled", "checked_in", "in_progress"].includes(a.status) && a.scheduled_at >= todayStart).reverse();
  const history = theirs.filter((a) => !upcoming.includes(a));

  return (
    <div className="space-y-6">
      <Link to="/patients" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" aria-hidden />
        All patients
      </Link>

      <Card className="overflow-hidden">
        <div className="h-20 bg-linear-to-r from-brand-600 to-brand-500" aria-hidden />
        <div className="flex flex-col gap-4 px-6 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar name={patient.full_name} size="lg" className="-mt-7 ring-4 ring-white" />
            <div className="pt-3">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">{patient.full_name}</h1>
              <p className="text-sm text-slate-500">Patient since {formatDate(patient.created_at, "short")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
            <span className="tabular inline-flex items-center gap-1.5"><Phone className="size-4 text-slate-400" aria-hidden />{formatPhone(patient.phone)}</span>
            <span className="inline-flex items-center gap-1.5"><Mail className="size-4 text-slate-400" aria-hidden />{patient.email ?? "No email"}</span>
            {!isPhysician && <EditContactDialog patient={patient} />}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {isPhysician && medical && <MedicalInfoCard info={medical} />}

          <Card>
            <CardHeader title="Visit history" description={isPhysician ? "Notes from every visit, including colleagues'." : "Past appointments and their outcome."} />
            <CardBody>
              {!isPhysician && (
                <p className="mb-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  <Lock className="size-3.5" aria-hidden />
                  Clinical notes are only visible to physicians.
                </p>
              )}
              {history.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No previous visits" className="py-6" />
              ) : (
                <ol className="relative space-y-6 border-l border-slate-200 pl-6">
                  {history.map((a) => {
                    const note = notes.find((n) => n.appointment_id === a.id);
                    return (
                      <li key={a.id} className="relative">
                        <span className="absolute top-1 -left-[31px] size-3 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200" aria-hidden />
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{formatDate(a.scheduled_at)}</p>
                          <StatusBadge status={a.status} />
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {formatTime(a.scheduled_at)} · {getStaff(a.physician_id)?.full_name} · {getDepartment(a.department_id)?.name}
                        </p>
                        {a.cancellation_reason && <p className="mt-1 text-sm text-slate-500 italic">"{a.cancellation_reason}"</p>}
                        {isPhysician && note && (
                          <dl className="mt-3 grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 text-sm sm:grid-cols-3">
                            <div><dt className="text-xs font-medium text-slate-500">Symptoms</dt><dd className="mt-0.5 text-slate-800">{note.symptoms}</dd></div>
                            <div><dt className="text-xs font-medium text-slate-500">Diagnosis</dt><dd className="mt-0.5 font-medium text-slate-900">{note.diagnosis}</dd></div>
                            <div><dt className="text-xs font-medium text-slate-500">Prescription</dt><dd className="mt-0.5 text-slate-800">{note.prescription ?? "None"}</dd></div>
                          </dl>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="lg:self-start">
          <CardHeader title="Upcoming" description={`${upcoming.length} booked`} />
          <CardBody>
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Nothing booked" className="py-6" />
            ) : (
              <ul className="space-y-3">
                {upcoming.map((a) => (
                  <li key={a.id} className="rounded-xl border border-slate-200/80 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {a.scheduled_at.startsWith(DEMO_TODAY) ? "Today" : formatDate(a.scheduled_at, "weekday")} · {formatTime(a.scheduled_at)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{getStaff(a.physician_id)?.full_name}</p>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="mt-2 font-mono text-xs text-slate-400">{a.reference_code}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function EditContactDialog({ patient }: { patient: Patient }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ fullName: patient.full_name, phone: formatPhone(patient.phone), email: patient.email ?? "" });
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    fullName: values.fullName.trim() ? undefined : "Enter a name",
    phone: isValidPhone(values.phone) ? undefined : "Enter a valid phone number",
    email: !values.email || isValidEmail(values.email) ? undefined : "Enter a valid email address",
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    patientStore.update(patient.id, { full_name: values.fullName.trim(), phone: normalizePhone(values.phone), email: values.email.trim() || null });
    toast.success("Contact details updated");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Pencil aria-hidden />
        Edit contact
      </Button>
      <DialogContent size="sm" title="Edit contact details">
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full name" error={submitted ? errors.fullName : undefined}>
            {(a11y) => <Input {...a11y} value={values.fullName} onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))} />}
          </Field>
          <Field label="Phone number" error={submitted ? errors.phone : undefined}>
            {(a11y) => <Input {...a11y} type="tel" value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} />}
          </Field>
          <Field label="Email" optional error={submitted ? errors.email : undefined}>
            {(a11y) => <Input {...a11y} type="email" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} />}
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
