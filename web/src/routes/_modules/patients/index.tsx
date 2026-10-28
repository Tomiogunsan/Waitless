import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { UserPlus, Users } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import Avatar from "@/shared/avatar/avatar";
import Button from "@/shared/button/button";
import { buttonStyles } from "@/shared/button/button-styles";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/shared/dialog/dialog";
import Field from "@/shared/form-field/form-field";
import Input from "@/shared/input/input";
import PageHeader from "@/shared/page-header/page-header";
import { cn } from "@/utils/cn";
import { DEMO_TODAY, demoNow } from "@/utils/demo-clock";
import {
  formatPhone,
  isValidEmail,
  isValidPhone,
  normalizePhone,
} from "@/utils/format";
import { requireRole } from "@/utils/guards";
import { useMockStaffId, useRole } from "@/utils/session";
import { formatDate } from "@/utils/time";
import { patientStore, useAppointments, usePatients } from "@/mocks/store";
import type { ITableHead } from "@/shared/table/interface";
import Table from "@/shared/table/table";
import TableEmptyState from "@/shared/table/table-empty-state";
import type { Patient } from "@/types/clinic";

export const Route = createFileRoute("/_modules/patients/")({
  beforeLoad: ({ context }) =>
    requireRole(context.session, ["front_desk", "physician", "admin"]),
  component: PatientsPage,
});

type PatientRow = Patient & {
  last_visit_at: string | null;
  next_appointment_at: string | null;
};

const PATIENT_COLUMNS: ITableHead<PatientRow>[] = [
  {
    label: "Patient",
    accessor: "full_name",
    sticky: true,
    stickyTo: "left",
    render: (patient) => (
      <div className="flex min-w-48 items-center gap-3">
        <Avatar name={patient.full_name} size="md" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">
            {patient.full_name}
          </p>
          <p className="tabular truncate text-xs text-slate-500">
            {formatPhone(patient.phone)}
          </p>
        </div>
      </div>
    ),
  },
  { label: "Email", accessor: "email" },
  {
    label: "Last visit",
    accessor: "last_visit_at",
    render: (patient) =>
      patient.last_visit_at ? (
        formatDate(patient.last_visit_at, "short")
      ) : (
        <span className="text-slate-400">None yet</span>
      ),
  },
  {
    label: "Next appointment",
    accessor: "next_appointment_at",
    render: (patient) =>
      patient.next_appointment_at ? (
        <span className="font-medium text-brand-700">
          {patient.next_appointment_at.startsWith(DEMO_TODAY)
            ? "Today"
            : formatDate(patient.next_appointment_at, "short")}
        </span>
      ) : (
        <span className="text-slate-400">None booked</span>
      ),
  },
  {
    label: "Registered",
    accessor: "created_at",
    align: "right",
    render: (patient) => (
      <span className="text-slate-500">
        {formatDate(patient.created_at, "short")}
      </span>
    ),
  },
];

function PatientsPage() {
  const myId = useMockStaffId();
  const role = useRole();
  const navigate = useNavigate();
  const allPatients = usePatients();
  const appointments = useAppointments();
  const [query, setQuery] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const isPhysician = role === "physician";

  const rows = useMemo<PatientRow[]>(() => {
    const today = new Date(`${DEMO_TODAY}T00:00:00+01:00`).toISOString();
    // Physicians only see patients they have an appointment with, like the RLS policy.
    const visible = isPhysician
      ? allPatients.filter((p) =>
          appointments.some(
            (a) =>
              a.patient_id === p.id &&
              a.physician_id === myId &&
              a.status !== "cancelled",
          ),
        )
      : allPatients;
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");

    return visible
      .filter(
        (p) =>
          !q ||
          p.full_name.toLowerCase().includes(q) ||
          (digits.length > 2 &&
            formatPhone(p.phone).replace(/\s/g, "").includes(digits)) ||
          p.email?.toLowerCase().includes(q),
      )
      .map((p) => {
        const theirs = appointments.filter((a) => a.patient_id === p.id);
        const lastVisit = theirs
          .filter((a) => a.status === "completed")
          .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))[0];
        const next = theirs
          .filter(
            (a) =>
              ["scheduled", "checked_in"].includes(a.status) &&
              a.scheduled_at >= today,
          )
          .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];
        return {
          ...p,
          last_visit_at: lastVisit?.scheduled_at ?? null,
          next_appointment_at: next?.scheduled_at ?? null,
        };
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [allPatients, appointments, isPhysician, myId, query]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isPhysician ? "My patients" : "Patients"}
        description={
          isPhysician
            ? "Patients with an appointment booked with you."
            : "Search, register and update patient records."
        }
        actions={
          !isPhysician && (
            <Button onClick={() => setRegisterOpen(true)}>
              <UserPlus aria-hidden />
              Register patient
            </Button>
          )
        }
      />

      <Table<PatientRow>
        tableHeads={PATIENT_COLUMNS}
        dataTableSource={rows}
        onRowClick={(patient) =>
          void navigate({
            to: "/patients/$patientId",
            params: { patientId: patient.id },
          })
        }
        showSearch
        searchPlaceholder="Search by name, phone or email"
        searchValue={query}
        onSearch={setQuery}
        showPagination
        pageSize={10}
        toolbar={
          <p className="text-sm text-slate-500">
            <span className="font-medium text-slate-900">{rows.length}</span>{" "}
            {rows.length === 1 ? "patient" : "patients"}
          </p>
        }
        tableEmptyState={
          query ? (
            <TableEmptyState
              variant="no-results"
              title="No patients match your search"
              description="Check the spelling, or search by phone number instead."
            />
          ) : (
            <TableEmptyState
              icon={Users}
              title="No patients yet"
              action={
                !isPhysician && (
                  <Button
                    variant="secondary"
                    onClick={() => setRegisterOpen(true)}
                  >
                    Register a new patient
                  </Button>
                )
              }
            />
          )
        }
      />

      <RegisterPatientDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
      />
    </div>
  );
}

function RegisterPatientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const patients = usePatients();
  const [values, setValues] = useState({ fullName: "", phone: "", email: "" });
  const [submitted, setSubmitted] = useState(false);

  // Phone numbers are unique, so warn before the database would reject it.
  const existing = isValidPhone(values.phone)
    ? patients.find((p) => p.phone === normalizePhone(values.phone))
    : undefined;
  const errors = {
    fullName: values.fullName.trim()
      ? undefined
      : "Enter the patient's full name",
    phone: !isValidPhone(values.phone)
      ? "Enter a valid phone number"
      : existing
        ? "This number already belongs to a patient"
        : undefined,
    email:
      !values.email || isValidEmail(values.email)
        ? undefined
        : "Enter a valid email address",
  };

  const close = () => {
    setValues({ fullName: "", phone: "", email: "" });
    setSubmitted(false);
    onOpenChange(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    patientStore.add({
      id: `pat-${crypto.randomUUID()}`,
      full_name: values.fullName.trim(),
      phone: normalizePhone(values.phone),
      email: values.email.trim() || null,
      created_at: demoNow().toISOString(),
    });
    toast.success(`${values.fullName.trim()} registered`);
    close();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent
        title="Register patient"
        description="Add a walk-in or phone patient. They can then be booked in."
      >
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
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
              />
            )}
          </Field>
          <Field
            label="Phone number"
            error={submitted || existing ? errors.phone : undefined}
            hint={
              isValidPhone(values.phone)
                ? `Saved as ${normalizePhone(values.phone)}`
                : "Nigerian numbers like 0803 123 4567 are converted automatically."
            }
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="tel"
                value={values.phone}
                onChange={(e) =>
                  setValues((v) => ({ ...v, phone: e.target.value }))
                }
                placeholder="0803 123 4567"
              />
            )}
          </Field>
          {existing && (
            <Link
              to="/patients/$patientId"
              params={{ patientId: existing.id }}
              className={cn(
                buttonStyles({ variant: "soft", size: "sm" }),
                "w-full",
              )}
            >
              Open {existing.full_name}'s record instead
            </Link>
          )}
          <Field
            label="Email"
            optional
            error={submitted ? errors.email : undefined}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="email"
                value={values.email}
                onChange={(e) =>
                  setValues((v) => ({ ...v, email: e.target.value }))
                }
              />
            )}
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit">Register patient</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
