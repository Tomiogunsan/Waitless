import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import Alert from "@/shared/alert/alert";
import Button from "@/shared/button/button";
import PageHeader from "@/shared/page-header/page-header";
import Table from "@/shared/table/table";
import TableEmptyState from "@/shared/table/table-empty-state";
import { usePatientDirectory } from "@/hooks/use-patients";
import type { PatientDirectoryRow } from "@/types/patient";
import { requireRole } from "@/utils/guards";
import { useRole } from "@/utils/session";
import { PATIENT_COLUMNS } from "./-components/patient-columns";
import { RegisterPatientDialog } from "./-components/register-patient-dialog";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/_modules/patients/")({
  beforeLoad: ({ context }) =>
    requireRole(context.session, ["front_desk", "physician", "admin"]),
  component: PatientsPage,
});

function PatientsPage() {
  const role = useRole();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [registerOpen, setRegisterOpen] = useState(false);
  const isPhysician = role === "physician";
  // The database only returns a physician's own patients.
  const { data, isPending, isError } = usePatientDirectory(query, page, PAGE_SIZE);
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

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

      {isError && (
        <Alert
          tone="danger"
          icon={AlertTriangle}
          title="We couldn't load patients. Refresh to try again."
        />
      )}

      <Table<PatientDirectoryRow>
        tableHeads={PATIENT_COLUMNS}
        dataTableSource={rows}
        loading={isPending}
        onRowClick={(patient) =>
          void navigate({
            to: "/patients/$patientId",
            params: { patientId: patient.id },
          })
        }
        showSearch
        searchPlaceholder="Search by name, phone or email"
        searchValue={query}
        onSearch={(value) => {
          setQuery(value);
          setPage(1);
        }}
        showPagination
        pageSize={PAGE_SIZE}
        currentPage={page}
        total={total}
        onPageChange={(next) => setPage(next)}
        toolbar={
          <p className="text-sm text-slate-500">
            <span className="font-medium text-slate-900">{total}</span>{" "}
            {total === 1 ? "patient" : "patients"}
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
