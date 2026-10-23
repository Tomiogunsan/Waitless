
-- Waitless: Clinic Management Database
-- Migration 1: Core tables
-- Weekday convention: Monday = 1, Sunday = 7.

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- The 40-minute block an appointment reserves, for exclusion constraints.
-- Postgres marks timestamptz + interval as only STABLE, because day and
-- month intervals depend on the time zone. Adding a fixed number of
-- minutes never does, so this function is safely IMMUTABLE.
CREATE OR REPLACE FUNCTION public.appointment_time_range(
    p_scheduled_at TIMESTAMPTZ
)
RETURNS TSTZRANGE
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
    SELECT tstzrange(p_scheduled_at, p_scheduled_at + INTERVAL '40 minutes', '[)');
$$;

-- 1. Clinic departments
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE
        CHECK (length(trim(name)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Staff accounts and roles
-- Every physician belongs to exactly one department;
-- other staff do not belong to a department.
CREATE TABLE public.staff (
    id UUID PRIMARY KEY REFERENCES auth.users(id)
        ON DELETE RESTRICT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL
        CHECK (role IN ('physician', 'front_desk', 'admin')),
    department_id UUID REFERENCES public.departments(id),
    -- Deactivated staff keep their history but lose all access.
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deactivated_at TIMESTAMPTZ,
    UNIQUE (id, role),
    CHECK ((role = 'physician') = (department_id IS NOT NULL)),
    CHECK (is_active = (deactivated_at IS NULL))
);

-- 3. Patient contact details
-- Phone numbers are stored in international form (e.g. +2348031234567)
-- and are unique, so returning patients are matched by phone.
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE
        CHECK (phone ~ '^\+[0-9]{8,15}$'),
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Patient medical information
CREATE TABLE public.patient_medical_info (
    patient_id UUID PRIMARY KEY
        REFERENCES public.patients(id) ON DELETE CASCADE,
    allergies TEXT NOT NULL DEFAULT 'Unknown'
        CHECK (length(trim(allergies)) > 0),
    medical_history TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Physician working hours
CREATE TABLE public.physician_working_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    physician_id UUID NOT NULL,
    physician_role TEXT NOT NULL DEFAULT 'physician'
        CHECK (physician_role = 'physician'),
    day_of_week SMALLINT NOT NULL
        CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (physician_id, physician_role)
        REFERENCES public.staff(id, role),

    CHECK (start_time < end_time),

    EXCLUDE USING gist (
        physician_id WITH =,
        day_of_week WITH =,
        int4range(
            EXTRACT(EPOCH FROM start_time)::INTEGER,
            EXTRACT(EPOCH FROM end_time)::INTEGER,
            '[)'
        ) WITH &&
    )
);

COMMENT ON COLUMN public.physician_working_hours.day_of_week IS
    'ISO weekday: Monday = 1, Tuesday = 2, ..., Sunday = 7.';

-- 6. Full-day physician schedule exceptions
CREATE TABLE public.physician_schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    physician_id UUID NOT NULL,
    physician_role TEXT NOT NULL DEFAULT 'physician'
        CHECK (physician_role = 'physician'),
    exception_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (physician_id, physician_role)
        REFERENCES public.staff(id, role),

    UNIQUE (physician_id, exception_date)
);

-- 7. Appointments

CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    reference_code TEXT NOT NULL UNIQUE
        DEFAULT (
            'CLN-' ||
            upper(
                substr(
                    replace(gen_random_uuid()::TEXT, '-', ''),
                    1,
                    12
                )
            )
        ),

    patient_id UUID NOT NULL
        REFERENCES public.patients(id),

    physician_id UUID NOT NULL,
    physician_role TEXT NOT NULL DEFAULT 'physician'
        CHECK (physician_role = 'physician'),

    -- Department at booking time, kept for per-department analytics
    -- even if the physician later moves department.
    department_id UUID NOT NULL
        REFERENCES public.departments(id),

    -- Original booking time never changes.
    original_scheduled_at TIMESTAMPTZ NOT NULL,

    -- Current planned appointment time.
    scheduled_at TIMESTAMPTZ NOT NULL,

    -- Check-in and consultation timestamps.
    checked_in_at TIMESTAMPTZ,
    actual_started_at TIMESTAMPTZ,
    actual_ended_at TIMESTAMPTZ,

    -- Cancellation audit fields.
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.staff(id),
    cancelled_by_patient BOOLEAN NOT NULL DEFAULT FALSE,
    cancellation_reason TEXT,

    -- No-show audit fields.
    no_show_at TIMESTAMPTZ,
    no_show_by UUID REFERENCES public.staff(id),

    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (
            status IN (
                'scheduled',
                'checked_in',
                'in_progress',
                'completed',
                'cancelled',
                'no_show'
            )
        ),

    -- Human review for scheduling conflicts or delays.
    reschedule_needs_review BOOLEAN NOT NULL DEFAULT FALSE,
    reschedule_review_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure the assigned staff member is a physician.
    FOREIGN KEY (physician_id, physician_role)
        REFERENCES public.staff(id, role),

    -- Supports visit-note ownership by appointment and physician.
    UNIQUE (id, physician_id),

    -- Consultation timestamps must be logically ordered.
    CONSTRAINT appointments_timestamp_order_check CHECK (
        (
            actual_ended_at IS NULL
            OR actual_started_at IS NOT NULL
        )
        AND
        (
            actual_started_at IS NULL
            OR actual_ended_at IS NULL
            OR actual_started_at < actual_ended_at
        )
    ),

    -- Required timestamps depend on appointment status.
    CONSTRAINT appointments_status_timestamps_check CHECK (
        CASE status
            WHEN 'scheduled' THEN
                checked_in_at IS NULL
                AND actual_started_at IS NULL
                AND actual_ended_at IS NULL

            WHEN 'checked_in' THEN
                checked_in_at IS NOT NULL
                AND actual_started_at IS NULL
                AND actual_ended_at IS NULL

            WHEN 'in_progress' THEN
                checked_in_at IS NOT NULL
                AND actual_started_at IS NOT NULL
                AND actual_ended_at IS NULL

            WHEN 'completed' THEN
                checked_in_at IS NOT NULL
                AND actual_started_at IS NOT NULL
                AND actual_ended_at IS NOT NULL

            WHEN 'cancelled' THEN
                actual_started_at IS NULL
                AND actual_ended_at IS NULL

            WHEN 'no_show' THEN
                checked_in_at IS NULL
                AND actual_started_at IS NULL
                AND actual_ended_at IS NULL

            ELSE FALSE
        END
    ),

    -- Cancellation details must match cancellation status.
    -- A cancellation is made either by a staff member or by the patient.
    CONSTRAINT appointments_cancellation_check CHECK (
        (
            status = 'cancelled'
            AND cancelled_at IS NOT NULL
            AND (cancelled_by IS NOT NULL) <> cancelled_by_patient
        )
        OR
        (
            status <> 'cancelled'
            AND cancelled_at IS NULL
            AND cancelled_by IS NULL
            AND cancelled_by_patient = FALSE
            AND cancellation_reason IS NULL
        )
    ),

    -- No-show details must match no-show status.
    CONSTRAINT appointments_no_show_check CHECK (
        (
            status = 'no_show'
            AND no_show_at IS NOT NULL
            AND no_show_by IS NOT NULL
        )
        OR
        (
            status <> 'no_show'
            AND no_show_at IS NULL
            AND no_show_by IS NULL
        )
    ),

    -- Review flag and reason must be consistent.
    CONSTRAINT appointments_reschedule_review_check CHECK (
        (
            reschedule_needs_review = TRUE
            AND reschedule_review_reason IS NOT NULL
            AND length(trim(reschedule_review_reason)) > 0
        )
        OR
        (
            reschedule_needs_review = FALSE
            AND reschedule_review_reason IS NULL
        )
    ),

    -- Reserve 40 minutes per active appointment.
    -- Half-open intervals allow the next appointment to start
    -- exactly when the previous reserved block ends.
    -- Deferred so delay shifts can move several slots in one statement.
    CONSTRAINT appointments_no_physician_overlap EXCLUDE USING gist (
        physician_id WITH =,
        public.appointment_time_range(scheduled_at) WITH &&
    )
    WHERE (
        status IN (
            'scheduled',
            'checked_in',
            'in_progress'
        )
    )
    DEFERRABLE INITIALLY DEFERRED,

    -- A patient cannot hold two overlapping active appointments.
    CONSTRAINT appointments_no_patient_overlap EXCLUDE USING gist (
        patient_id WITH =,
        public.appointment_time_range(scheduled_at) WITH &&
    )
    WHERE (
        status IN (
            'scheduled',
            'checked_in',
            'in_progress'
        )
    )
    DEFERRABLE INITIALLY DEFERRED
);


-- 8. Clinical visit notes
CREATE TABLE public.visit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    appointment_id UUID NOT NULL,
    physician_id UUID NOT NULL,
    physician_role TEXT NOT NULL DEFAULT 'physician'
        CHECK (physician_role = 'physician'),

    symptoms TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    prescription TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (physician_id, physician_role)
        REFERENCES public.staff(id, role),

    FOREIGN KEY (appointment_id, physician_id)
        REFERENCES public.appointments(id, physician_id),

    UNIQUE (appointment_id),

    CHECK (length(trim(symptoms)) > 0),
    CHECK (length(trim(diagnosis)) > 0)
);

CREATE INDEX idx_appointments_patient
    ON public.appointments(patient_id);

CREATE INDEX idx_appointments_physician_schedule
    ON public.appointments(physician_id, scheduled_at);

CREATE INDEX idx_appointments_status_schedule
    ON public.appointments(status, scheduled_at);

CREATE INDEX idx_appointments_department_schedule
    ON public.appointments(department_id, scheduled_at);

CREATE INDEX idx_staff_department
    ON public.staff(department_id)
    WHERE role = 'physician';

CREATE INDEX idx_visit_notes_physician
    ON public.visit_notes(physician_id);

-- A physician can run only one consultation at a time.
CREATE UNIQUE INDEX idx_appointments_one_in_progress_per_physician
    ON public.appointments(physician_id)
    WHERE status = 'in_progress';