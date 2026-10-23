
-- Migration 2: Security and permissions
-- Helper functions for identifying authenticated staff.
-- Deactivated staff are treated as having no role at all,
-- so every policy and workflow function locks them out.

CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT s.role
    FROM public.staff AS s
    WHERE s.id = (SELECT auth.uid())
      AND s.is_active
    LIMIT 1;
$$;


-- Check whether the authenticated user is an administrator.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.staff AS s
        WHERE s.id = (SELECT auth.uid())
          AND s.role = 'admin'
          AND s.is_active
    );
$$;


-- Check whether the authenticated user has a staff account.

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.staff AS s
        WHERE s.id = (SELECT auth.uid())
          AND s.is_active
    );
$$;


-- Check whether the authenticated physician has a non-cancelled
-- appointment with the given patient.

CREATE OR REPLACE FUNCTION public.physician_treats_patient(
    p_patient_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.appointments AS a
        WHERE a.patient_id = p_patient_id
          AND a.physician_id = (SELECT auth.uid())
          AND a.status <> 'cancelled'
    );
$$;


-- Check whether the authenticated physician treats the patient
-- that the given appointment belongs to.

CREATE OR REPLACE FUNCTION public.physician_treats_appointment_patient(
    p_appointment_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.appointments AS note_appointment
        JOIN public.appointments AS own_appointment
          ON own_appointment.patient_id = note_appointment.patient_id
        WHERE note_appointment.id = p_appointment_id
          AND own_appointment.physician_id = (SELECT auth.uid())
          AND own_appointment.status <> 'cancelled'
    );
$$;


-- Ensure helper functions use a trusted database owner
-- and are callable only by signed-in users.

ALTER FUNCTION public.current_staff_role() OWNER TO postgres;
ALTER FUNCTION public.is_admin() OWNER TO postgres;
ALTER FUNCTION public.is_staff() OWNER TO postgres;
ALTER FUNCTION public.physician_treats_patient(UUID) OWNER TO postgres;
ALTER FUNCTION public.physician_treats_appointment_patient(UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.current_staff_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.physician_treats_patient(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.physician_treats_appointment_patient(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.physician_treats_patient(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.physician_treats_appointment_patient(UUID) TO authenticated;



-- Enable Row Level Security on all clinic tables.

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_medical_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physician_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physician_schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_notes ENABLE ROW LEVEL SECURITY;


-- Remove Supabase's default table privileges.
-- TRUNCATE bypasses RLS, so nothing is granted unless listed below.
-- All writes other than patient registration go through
-- the SECURITY DEFINER workflow functions.

REVOKE ALL ON TABLE
    public.departments,
    public.staff,
    public.patients,
    public.patient_medical_info,
    public.physician_working_hours,
    public.physician_schedule_exceptions,
    public.appointments,
    public.visit_notes
FROM anon, authenticated;



-- Departments are public so patients can choose one when booking.

GRANT SELECT ON TABLE public.departments TO anon, authenticated;

CREATE POLICY "anyone_can_view_departments"
ON public.departments
FOR SELECT
TO anon, authenticated
USING (TRUE);


-- Allow authenticated staff to view the staff directory.

GRANT SELECT ON TABLE public.staff TO authenticated;

CREATE POLICY "staff_can_view_staff_directory"
ON public.staff
FOR SELECT
TO authenticated
USING (
    (SELECT public.is_staff())
);


-- Front-desk staff and administrators manage patient contact records.
-- Clients may only set contact fields, never id or created_at.

GRANT SELECT ON TABLE public.patients TO authenticated;

GRANT INSERT (full_name, phone, email)
ON TABLE public.patients TO authenticated;

GRANT UPDATE (full_name, phone, email)
ON TABLE public.patients TO authenticated;


-- Front-desk staff and administrators can view all patients.
-- Physicians can view only patients they have appointments with.

CREATE POLICY "staff_can_view_patients"
ON public.patients
FOR SELECT
TO authenticated
USING (
    (SELECT public.current_staff_role())
        IN ('front_desk', 'admin')
    OR (
        (SELECT public.current_staff_role()) = 'physician'
        AND public.physician_treats_patient(id)
    )
);


-- Allow front-desk staff and administrators to register patients.

CREATE POLICY "authorized_staff_can_register_patients"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT public.current_staff_role())
    IN ('front_desk', 'admin')
);


-- Allow front-desk staff and administrators to update patient records.

CREATE POLICY "authorized_staff_can_update_patients"
ON public.patients
FOR UPDATE
TO authenticated
USING (
    (SELECT public.current_staff_role())
    IN ('front_desk', 'admin')
)
WITH CHECK (
    (SELECT public.current_staff_role())
    IN ('front_desk', 'admin')
);


-- Only physicians treating the patient may read medical information.
-- Controlled medical-record updates will be defined separately.

GRANT SELECT ON TABLE public.patient_medical_info TO authenticated;

CREATE POLICY "physicians_can_view_patient_medical_info"
ON public.patient_medical_info
FOR SELECT
TO authenticated
USING (
    (SELECT public.current_staff_role()) = 'physician'
    AND public.physician_treats_patient(patient_id)
);


-- Physicians can read the visit notes of patients they treat,
-- including notes written by colleagues, for continuity of care.
-- Notes are written only through the consultation workflow.

GRANT SELECT ON TABLE public.visit_notes TO authenticated;

CREATE POLICY "physicians_can_view_visit_notes"
ON public.visit_notes
FOR SELECT
TO authenticated
USING (
    (SELECT public.current_staff_role()) = 'physician'
    AND public.physician_treats_appointment_patient(appointment_id)
);


-- Physicians can view only their assigned appointments.
-- Front-desk staff and administrators can view all appointments.
-- Appointment changes must go through secure workflow functions.

GRANT SELECT ON TABLE public.appointments TO authenticated;

CREATE POLICY "staff_can_view_allowed_appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
    (SELECT public.current_staff_role())
        IN ('front_desk', 'admin')
    OR (
        (SELECT public.current_staff_role()) = 'physician'
        AND physician_id = (SELECT auth.uid())
    )
);


-- Allow authenticated staff to view physician schedules.
-- Schedule changes will be defined separately.

GRANT SELECT ON TABLE public.physician_working_hours TO authenticated;

CREATE POLICY "staff_can_view_physician_working_hours"
ON public.physician_working_hours
FOR SELECT
TO authenticated
USING (
    (SELECT public.is_staff())
);

GRANT SELECT ON TABLE public.physician_schedule_exceptions TO authenticated;

CREATE POLICY "staff_can_view_physician_schedule_exceptions"
ON public.physician_schedule_exceptions
FOR SELECT
TO authenticated
USING (
    (SELECT public.is_staff())
);


-- Convert a phone number to international form so the same number
-- typed in different ways matches one patient.
-- Nigerian local numbers (0803...) become +234803...
-- Returns a value without a leading + when the input is not valid.

CREATE OR REPLACE FUNCTION public.normalize_phone(
    p_phone TEXT
)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
SET search_path = ''
AS $$
    SELECT CASE
        WHEN d.digits ~ '^0[0-9]{10}$' THEN '+234' || substr(d.digits, 2)
        WHEN d.digits ~ '^234[0-9]{10}$' THEN '+' || d.digits
        WHEN p_phone ~ '^\s*\+' THEN '+' || d.digits
        ELSE d.digits
    END
    FROM (
        SELECT regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') AS digits
    ) AS d;
$$;

REVOKE ALL ON FUNCTION public.normalize_phone(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO authenticated;


-- Normalize patient phone numbers however the record is written.

CREATE OR REPLACE FUNCTION public.normalize_patient_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.phone := public.normalize_phone(NEW.phone);
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_patient_phone()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER normalize_patient_phone_before_write
BEFORE INSERT OR UPDATE OF phone ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.normalize_patient_phone();


-- Automatically create a medical-information record for each new patient.

CREATE OR REPLACE FUNCTION public.create_patient_medical_info()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.patient_medical_info (patient_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.create_patient_medical_info() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.create_patient_medical_info()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER create_patient_medical_info_after_insert
AFTER INSERT ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.create_patient_medical_info();


-- Securely check in a patient.
-- Only front-desk staff and administrators may perform this action,
-- and only on the appointment's own (Lagos) calendar day.

CREATE OR REPLACE FUNCTION public.check_in_appointment(
    p_appointment_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_status TEXT;
    v_scheduled_at TIMESTAMPTZ;
BEGIN
    -- Verify the caller's staff role.
    v_role := public.current_staff_role();

    IF v_role IS DISTINCT FROM 'front_desk'
       AND v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Not authorized to check in appointments';
    END IF;

    -- Lock the appointment to prevent simultaneous state changes.
    SELECT a.status, a.scheduled_at
    INTO v_status, v_scheduled_at
    FROM public.appointments AS a
    WHERE a.id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found';
    END IF;

    IF v_status IS DISTINCT FROM 'scheduled' THEN
        RAISE EXCEPTION 'Only scheduled appointments can be checked in';
    END IF;

    IF (v_scheduled_at AT TIME ZONE 'Africa/Lagos')::DATE
       <> (clock_timestamp() AT TIME ZONE 'Africa/Lagos')::DATE THEN
        RAISE EXCEPTION
            'Patients can only be checked in on the day of their appointment';
    END IF;

    -- Record check-in and change status together.
    UPDATE public.appointments
    SET
        status = 'checked_in',
        checked_in_at = clock_timestamp()
    WHERE id = p_appointment_id;
END;
$$;

ALTER FUNCTION public.check_in_appointment(UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.check_in_appointment(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_in_appointment(UUID) TO authenticated;


-- Securely start a consultation.
-- Only the assigned physician may start it after patient check-in,
-- and only when no other consultation of theirs is in progress.

CREATE OR REPLACE FUNCTION public.start_consultation(
    p_appointment_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_physician_id UUID;
    v_status TEXT;
BEGIN
    -- Verify that the caller is a physician.
    v_role := public.current_staff_role();

    IF v_role IS DISTINCT FROM 'physician' THEN
        RAISE EXCEPTION 'Only physicians can start consultations';
    END IF;

    -- Lock the appointment before checking its current state.
    SELECT a.physician_id, a.status
    INTO v_physician_id, v_status
    FROM public.appointments AS a
    WHERE a.id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found';
    END IF;

    -- Physicians may only start their own assigned appointments.
    IF v_physician_id IS DISTINCT FROM (SELECT auth.uid()) THEN
        RAISE EXCEPTION 'You are not assigned to this appointment';
    END IF;

    IF v_status IS DISTINCT FROM 'checked_in' THEN
        RAISE EXCEPTION 'Patient must be checked in before consultation';
    END IF;

    -- The unique index on in-progress appointments also enforces this.
    IF EXISTS (
        SELECT 1
        FROM public.appointments AS a
        WHERE a.physician_id = v_physician_id
          AND a.status = 'in_progress'
    ) THEN
        RAISE EXCEPTION
            'Complete your current consultation before starting another';
    END IF;

    -- Start the consultation and record its actual start time.
    UPDATE public.appointments
    SET
        status = 'in_progress',
        actual_started_at = clock_timestamp()
    WHERE id = p_appointment_id;
END;
$$;

ALTER FUNCTION public.start_consultation(UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.start_consultation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_consultation(UUID) TO authenticated;


-- Save or update a visit note during an active consultation.
-- Only the physician assigned to the appointment may do this.

CREATE OR REPLACE FUNCTION public.save_visit_note(
    p_appointment_id UUID,
    p_symptoms TEXT,
    p_diagnosis TEXT,
    p_prescription TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_physician_id UUID;
    v_status TEXT;
    v_note_id UUID;
BEGIN
    v_role := public.current_staff_role();

    IF v_role IS DISTINCT FROM 'physician' THEN
        RAISE EXCEPTION 'Only physicians can save visit notes';
    END IF;

    IF p_symptoms IS NULL OR length(trim(p_symptoms)) = 0
       OR p_diagnosis IS NULL OR length(trim(p_diagnosis)) = 0 THEN
        RAISE EXCEPTION 'Symptoms and diagnosis are required';
    END IF;

    SELECT a.physician_id, a.status
    INTO v_physician_id, v_status
    FROM public.appointments AS a
    WHERE a.id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found';
    END IF;

    IF v_physician_id IS DISTINCT FROM (SELECT auth.uid()) THEN
        RAISE EXCEPTION 'You are not assigned to this appointment';
    END IF;

    IF v_status IS DISTINCT FROM 'in_progress' THEN
        RAISE EXCEPTION 'Visit notes can only be saved during an active consultation';
    END IF;

    -- updated_at is maintained by the visit_notes_updated_at trigger.
    INSERT INTO public.visit_notes (
        appointment_id,
        physician_id,
        symptoms,
        diagnosis,
        prescription
    )
    VALUES (
        p_appointment_id,
        v_physician_id,
        trim(p_symptoms),
        trim(p_diagnosis),
        NULLIF(trim(p_prescription), '')
    )
    ON CONFLICT (appointment_id)
    DO UPDATE SET
        symptoms = EXCLUDED.symptoms,
        diagnosis = EXCLUDED.diagnosis,
        prescription = EXCLUDED.prescription
    RETURNING id INTO v_note_id;

    RETURN v_note_id;
END;
$$;

ALTER FUNCTION public.save_visit_note(UUID, TEXT, TEXT, TEXT) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.save_visit_note(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_visit_note(UUID, TEXT, TEXT, TEXT) TO authenticated;


-- Complete a consultation and safely handle scheduling delays.
-- Only the assigned physician may complete the appointment.

CREATE OR REPLACE FUNCTION public.complete_consultation(
    p_appointment_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_physician_id UUID;
    v_scheduled_at TIMESTAMPTZ;
    v_status TEXT;
    v_ended_at TIMESTAMPTZ;
    v_delay INTERVAL;
    v_unsafe BOOLEAN := FALSE;
BEGIN
    v_role := public.current_staff_role();

    IF v_role IS DISTINCT FROM 'physician' THEN
        RAISE EXCEPTION 'Only physicians can complete consultations';
    END IF;

    -- Lock the appointment before checking its state.
    SELECT a.physician_id, a.scheduled_at, a.status
    INTO v_physician_id, v_scheduled_at, v_status
    FROM public.appointments AS a
    WHERE a.id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found';
    END IF;

    IF v_physician_id IS DISTINCT FROM (SELECT auth.uid()) THEN
        RAISE EXCEPTION 'You are not assigned to this appointment';
    END IF;

    IF v_status IS DISTINCT FROM 'in_progress' THEN
        RAISE EXCEPTION 'Only an active consultation can be completed';
    END IF;

    -- A valid visit note must already exist.
    IF NOT EXISTS (
        SELECT 1
        FROM public.visit_notes AS n
        WHERE n.appointment_id = p_appointment_id
          AND n.physician_id = v_physician_id
          AND length(trim(n.symptoms)) > 0
          AND length(trim(n.diagnosis)) > 0
    ) THEN
        RAISE EXCEPTION
            'Save a visit note with symptoms and diagnosis before completing';
    END IF;

    v_ended_at := clock_timestamp();
    v_delay := v_ended_at - (v_scheduled_at + INTERVAL '40 minutes');

    -- Lock later appointments for this physician on the same
    -- Lagos calendar day before validating the proposed schedule.
    PERFORM a.id
    FROM public.appointments AS a
    WHERE a.physician_id = v_physician_id
      AND a.status IN ('scheduled', 'checked_in', 'in_progress')
      AND a.scheduled_at > v_scheduled_at
      AND (a.scheduled_at AT TIME ZONE 'Africa/Lagos')::date =
          (v_scheduled_at AT TIME ZONE 'Africa/Lagos')::date
    ORDER BY a.scheduled_at, a.id
    FOR UPDATE;

    -- Only a positive delay requires automatic rescheduling.
    -- Delay shifts only move appointments later, so the one-hour
    -- notice rule for new bookings does not apply here.
    IF v_delay > INTERVAL '0 minutes' THEN

        -- First, check whether any later appointment would be unsafe
        -- to move by the same delay.
        SELECT EXISTS (
            SELECT 1
            FROM public.appointments AS a
            CROSS JOIN LATERAL (
                SELECT
                    a.scheduled_at + v_delay AS target_at,
                    (a.scheduled_at + v_delay) AT TIME ZONE 'Africa/Lagos'
                        AS target_local
            ) AS proposed
            WHERE a.physician_id = v_physician_id
              AND a.status = 'scheduled'
              AND a.scheduled_at > v_scheduled_at
              AND (a.scheduled_at AT TIME ZONE 'Africa/Lagos')::date =
                  (v_scheduled_at AT TIME ZONE 'Africa/Lagos')::date
              AND (
                  -- Existing review flags must not be cleared automatically.
                  a.reschedule_needs_review

                  -- The appointment must remain on the same day.
                  OR proposed.target_local::date
                     <> (a.scheduled_at AT TIME ZONE 'Africa/Lagos')::date

                  -- The physician must not have a schedule exception.
                  OR EXISTS (
                      SELECT 1
                      FROM public.physician_schedule_exceptions AS e
                      WHERE e.physician_id = v_physician_id
                        AND e.exception_date = proposed.target_local::date
                  )

                  -- The entire slot must fit within one working-hours block.
                  -- Compared as timestamps so slots cannot wrap past midnight.
                  OR NOT EXISTS (
                      SELECT 1
                      FROM public.physician_working_hours AS h
                      WHERE h.physician_id = v_physician_id
                        AND h.day_of_week =
                            EXTRACT(ISODOW FROM proposed.target_local)::SMALLINT
                        AND proposed.target_local
                            >= proposed.target_local::date + h.start_time
                        AND proposed.target_local + INTERVAL '40 minutes'
                            <= proposed.target_local::date + h.end_time
                  )

                  -- The proposed slot must not collide with an appointment
                  -- that will remain at its current time, for either
                  -- this physician or the same patient.
                  OR EXISTS (
                      SELECT 1
                      FROM public.appointments AS b
                      WHERE (
                            b.physician_id = v_physician_id
                            OR b.patient_id = a.patient_id
                        )
                        AND b.id <> a.id
                        AND b.id <> p_appointment_id
                        AND b.status IN ('scheduled', 'checked_in', 'in_progress')
                        AND NOT (
                            b.physician_id = v_physician_id
                            AND b.status = 'scheduled'
                            AND b.scheduled_at > v_scheduled_at
                            AND (b.scheduled_at AT TIME ZONE 'Africa/Lagos')::date =
                                (v_scheduled_at AT TIME ZONE 'Africa/Lagos')::date
                        )
                        AND tstzrange(
                            proposed.target_at,
                            proposed.target_at + INTERVAL '40 minutes',
                            '[)'
                        ) && tstzrange(
                            b.scheduled_at,
                            b.scheduled_at + INTERVAL '40 minutes',
                            '[)'
                        )
                  )
              )
        )
        INTO v_unsafe;

        -- A checked-in or already-started later appointment cannot be moved.
        -- If it has already been affected by the delay, require staff review.
        IF EXISTS (
            SELECT 1
            FROM public.appointments AS a
            WHERE a.physician_id = v_physician_id
              AND a.status IN ('checked_in', 'in_progress')
              AND a.scheduled_at > v_scheduled_at
              AND (a.scheduled_at AT TIME ZONE 'Africa/Lagos')::date =
                  (v_scheduled_at AT TIME ZONE 'Africa/Lagos')::date
              AND a.scheduled_at < v_ended_at
        ) THEN
            v_unsafe := TRUE;
        END IF;

        IF v_unsafe THEN
            -- Leave later appointments at their current times.
            -- Flag them so staff can resolve the scheduling issue.
            UPDATE public.appointments AS a
            SET
                reschedule_needs_review = TRUE,
                reschedule_review_reason =
                    'Consultation delay requires staff review; later appointments could not all be safely rescheduled.'
            WHERE a.physician_id = v_physician_id
              AND a.status IN ('scheduled', 'checked_in', 'in_progress')
              AND a.scheduled_at > v_scheduled_at
              AND (a.scheduled_at AT TIME ZONE 'Africa/Lagos')::date =
                  (v_scheduled_at AT TIME ZONE 'Africa/Lagos')::date;
        ELSE
            -- Every proposed move passed validation.
            -- Applying the same delay preserves the spacing between slots.
            UPDATE public.appointments AS a
            SET scheduled_at = a.scheduled_at + v_delay
            WHERE a.physician_id = v_physician_id
              AND a.status = 'scheduled'
              AND a.scheduled_at > v_scheduled_at
              AND (a.scheduled_at AT TIME ZONE 'Africa/Lagos')::date =
                  (v_scheduled_at AT TIME ZONE 'Africa/Lagos')::date;
        END IF;
    END IF;

    -- Complete the current consultation.
    UPDATE public.appointments
    SET
        status = 'completed',
        actual_ended_at = v_ended_at
    WHERE id = p_appointment_id;
END;
$$;

ALTER FUNCTION public.complete_consultation(UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.complete_consultation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_consultation(UUID) TO authenticated;


-- Cancel an appointment.
-- Only front-desk staff and administrators may cancel appointments.

CREATE OR REPLACE FUNCTION public.cancel_appointment(
    p_appointment_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_status TEXT;
BEGIN
    v_role := public.current_staff_role();

    IF v_role IS DISTINCT FROM 'front_desk'
       AND v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION
            'Only front-desk staff or administrators can cancel appointments';
    END IF;

    SELECT a.status
    INTO v_status
    FROM public.appointments AS a
    WHERE a.id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found';
    END IF;

    IF v_status NOT IN ('scheduled', 'checked_in') THEN
        RAISE EXCEPTION
            'Only scheduled or checked-in appointments can be cancelled';
    END IF;

    UPDATE public.appointments
    SET
        status = 'cancelled',
        cancelled_at = clock_timestamp(),
        cancelled_by = (SELECT auth.uid()),
        cancellation_reason = NULLIF(trim(p_reason), '')
    WHERE id = p_appointment_id;
END;
$$;

ALTER FUNCTION public.cancel_appointment(UUID, TEXT) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.cancel_appointment(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_appointment(UUID, TEXT) TO authenticated;


-- Mark an appointment as a no-show.
-- Only front-desk staff and administrators may do this,
-- after a 15-minute grace period past the scheduled time.

CREATE OR REPLACE FUNCTION public.mark_appointment_no_show(
    p_appointment_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_scheduled_at TIMESTAMPTZ;
    v_status TEXT;
BEGIN
    v_role := public.current_staff_role();

    IF v_role IS DISTINCT FROM 'front_desk'
       AND v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION
            'Only front-desk staff or administrators can mark no-shows';
    END IF;

    SELECT a.scheduled_at, a.status
    INTO v_scheduled_at, v_status
    FROM public.appointments AS a
    WHERE a.id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found';
    END IF;

    IF v_status IS DISTINCT FROM 'scheduled' THEN
        RAISE EXCEPTION
            'Only scheduled appointments can be marked as no-show';
    END IF;

    IF v_scheduled_at + INTERVAL '15 minutes' > clock_timestamp() THEN
        RAISE EXCEPTION
            'A no-show can only be recorded 15 minutes after the scheduled time';
    END IF;

    UPDATE public.appointments
    SET
        status = 'no_show',
        no_show_at = clock_timestamp(),
        no_show_by = (SELECT auth.uid())
    WHERE id = p_appointment_id;
END;
$$;

ALTER FUNCTION public.mark_appointment_no_show(UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.mark_appointment_no_show(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_appointment_no_show(UUID) TO authenticated;


-- Manually reschedule an appointment.
-- Only front-desk staff and administrators may do this.
-- A checked-in appointment returns to scheduled, since the patient
-- will need to check in again at the new time.

CREATE OR REPLACE FUNCTION public.reschedule_appointment(
    p_appointment_id UUID,
    p_new_scheduled_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_patient_id UUID;
    v_physician_id UUID;
    v_status TEXT;
    v_new_local_ts TIMESTAMP;
    v_new_local_date DATE;
    v_day_of_week SMALLINT;
BEGIN
    v_role := public.current_staff_role();

    IF v_role IS DISTINCT FROM 'front_desk'
       AND v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION
            'Only front-desk staff or administrators can reschedule appointments';
    END IF;

    IF p_new_scheduled_at IS NULL THEN
        RAISE EXCEPTION 'A new appointment time is required';
    END IF;

    IF p_new_scheduled_at < clock_timestamp() + INTERVAL '1 hour' THEN
        RAISE EXCEPTION
            'Rescheduling requires at least one hour of notice';
    END IF;

    IF p_new_scheduled_at > clock_timestamp() + INTERVAL '30 days' THEN
        RAISE EXCEPTION
            'Appointments cannot be scheduled more than 30 days ahead';
    END IF;

    SELECT a.patient_id, a.physician_id, a.status
    INTO v_patient_id, v_physician_id, v_status
    FROM public.appointments AS a
    WHERE a.id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found';
    END IF;

    IF v_status NOT IN ('scheduled', 'checked_in') THEN
        RAISE EXCEPTION
            'Only scheduled or checked-in appointments can be rescheduled';
    END IF;

    v_new_local_ts :=
        p_new_scheduled_at AT TIME ZONE 'Africa/Lagos';
    v_new_local_date := v_new_local_ts::DATE;
    v_day_of_week :=
        EXTRACT(ISODOW FROM v_new_local_date)::SMALLINT;

    -- Reject dates when the physician is unavailable.
    IF EXISTS (
        SELECT 1
        FROM public.physician_schedule_exceptions AS e
        WHERE e.physician_id = v_physician_id
          AND e.exception_date = v_new_local_date
    ) THEN
        RAISE EXCEPTION
            'The physician is unavailable on the selected date';
    END IF;

    -- The entire 40-minute slot must fit within one working-hours block
    -- and start on a 40-minute boundary from the start of that block.
    -- Compared as timestamps so slots cannot wrap past midnight.
    IF NOT EXISTS (
        SELECT 1
        FROM public.physician_working_hours AS h
        WHERE h.physician_id = v_physician_id
          AND h.day_of_week = v_day_of_week
          AND v_new_local_ts >= v_new_local_date + h.start_time
          AND v_new_local_ts + INTERVAL '40 minutes'
              <= v_new_local_date + h.end_time
          AND EXTRACT(
                  EPOCH FROM v_new_local_ts - (v_new_local_date + h.start_time)
              ) % 2400 = 0
    ) THEN
        RAISE EXCEPTION
            'The new time must be an available 40-minute slot within the physician working hours';
    END IF;

    -- Reject overlapping active appointments for the physician.
    IF EXISTS (
        SELECT 1
        FROM public.appointments AS a
        WHERE a.physician_id = v_physician_id
          AND a.id <> p_appointment_id
          AND a.status IN ('scheduled', 'checked_in', 'in_progress')
          AND tstzrange(
              a.scheduled_at,
              a.scheduled_at + INTERVAL '40 minutes',
              '[)'
          ) && tstzrange(
              p_new_scheduled_at,
              p_new_scheduled_at + INTERVAL '40 minutes',
              '[)'
          )
    ) THEN
        RAISE EXCEPTION
            'The selected time conflicts with another appointment';
    END IF;

    -- Reject overlapping active appointments for the patient.
    IF EXISTS (
        SELECT 1
        FROM public.appointments AS a
        WHERE a.patient_id = v_patient_id
          AND a.id <> p_appointment_id
          AND a.status IN ('scheduled', 'checked_in', 'in_progress')
          AND tstzrange(
              a.scheduled_at,
              a.scheduled_at + INTERVAL '40 minutes',
              '[)'
          ) && tstzrange(
              p_new_scheduled_at,
              p_new_scheduled_at + INTERVAL '40 minutes',
              '[)'
          )
    ) THEN
        RAISE EXCEPTION
            'The patient already has another appointment at that time';
    END IF;

    UPDATE public.appointments
    SET
        scheduled_at = p_new_scheduled_at,
        status = 'scheduled',
        checked_in_at = NULL,
        reschedule_needs_review = FALSE,
        reschedule_review_reason = NULL
    WHERE id = p_appointment_id;
END;
$$;

ALTER FUNCTION public.reschedule_appointment(UUID, TIMESTAMPTZ) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.reschedule_appointment(UUID, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_appointment(UUID, TIMESTAMPTZ) TO authenticated;


-- Book an appointment for a patient.
-- Only front-desk staff and administrators may book appointments.

CREATE OR REPLACE FUNCTION public.book_appointment(
    p_patient_id UUID,
    p_physician_id UUID,
    p_scheduled_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_appointment_id UUID;
    v_department_id UUID;
    v_local_ts TIMESTAMP;
    v_local_date DATE;
    v_day_of_week SMALLINT;
BEGIN
    v_role := public.current_staff_role();

    IF v_role IS DISTINCT FROM 'front_desk'
       AND v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION
            'Only front-desk staff or administrators can book appointments';
    END IF;

    IF p_scheduled_at IS NULL THEN
        RAISE EXCEPTION 'An appointment time is required';
    END IF;

    IF p_scheduled_at < clock_timestamp() + INTERVAL '1 hour' THEN
        RAISE EXCEPTION
            'Appointments require at least one hour of notice';
    END IF;

    IF p_scheduled_at > clock_timestamp() + INTERVAL '30 days' THEN
        RAISE EXCEPTION
            'Appointments cannot be booked more than 30 days ahead';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.patients AS p
        WHERE p.id = p_patient_id
    ) THEN
        RAISE EXCEPTION 'Patient not found';
    END IF;

    SELECT s.department_id
    INTO v_department_id
    FROM public.staff AS s
    WHERE s.id = p_physician_id
      AND s.role = 'physician'
      AND s.is_active;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'A valid, active physician must be selected';
    END IF;

    v_local_ts :=
        p_scheduled_at AT TIME ZONE 'Africa/Lagos';
    v_local_date := v_local_ts::DATE;
    v_day_of_week :=
        EXTRACT(ISODOW FROM v_local_date)::SMALLINT;

    IF EXISTS (
        SELECT 1
        FROM public.physician_schedule_exceptions AS e
        WHERE e.physician_id = p_physician_id
          AND e.exception_date = v_local_date
    ) THEN
        RAISE EXCEPTION
            'The physician is unavailable on the selected date';
    END IF;

    -- The slot must start on a 40-minute boundary from the start
    -- of a working-hours block and end within it.
    -- Compared as timestamps so slots cannot wrap past midnight.
    IF NOT EXISTS (
        SELECT 1
        FROM public.physician_working_hours AS h
        WHERE h.physician_id = p_physician_id
          AND h.day_of_week = v_day_of_week
          AND v_local_ts >= v_local_date + h.start_time
          AND v_local_ts + INTERVAL '40 minutes'
              <= v_local_date + h.end_time
          AND EXTRACT(
                  EPOCH FROM v_local_ts - (v_local_date + h.start_time)
              ) % 2400 = 0
    ) THEN
        RAISE EXCEPTION
            'The appointment must be a 40-minute slot within the physician working hours';
    END IF;

    -- Check overlaps up front for clear error messages.
    -- The deferred exclusion constraints remain the final guard
    -- against concurrent bookings.
    IF EXISTS (
        SELECT 1
        FROM public.appointments AS a
        WHERE a.physician_id = p_physician_id
          AND a.status IN ('scheduled', 'checked_in', 'in_progress')
          AND tstzrange(
              a.scheduled_at,
              a.scheduled_at + INTERVAL '40 minutes',
              '[)'
          ) && tstzrange(
              p_scheduled_at,
              p_scheduled_at + INTERVAL '40 minutes',
              '[)'
          )
    ) THEN
        RAISE EXCEPTION
            'The selected time conflicts with another appointment';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.appointments AS a
        WHERE a.patient_id = p_patient_id
          AND a.status IN ('scheduled', 'checked_in', 'in_progress')
          AND tstzrange(
              a.scheduled_at,
              a.scheduled_at + INTERVAL '40 minutes',
              '[)'
          ) && tstzrange(
              p_scheduled_at,
              p_scheduled_at + INTERVAL '40 minutes',
              '[)'
          )
    ) THEN
        RAISE EXCEPTION
            'The patient already has another appointment at that time';
    END IF;

    INSERT INTO public.appointments (
        patient_id,
        physician_id,
        department_id,
        original_scheduled_at,
        scheduled_at
    )
    VALUES (
        p_patient_id,
        p_physician_id,
        v_department_id,
        p_scheduled_at,
        p_scheduled_at
    )
    RETURNING id INTO v_appointment_id;

    RETURN v_appointment_id;
END;
$$;

ALTER FUNCTION public.book_appointment(UUID, UUID, TIMESTAMPTZ) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.book_appointment(UUID, UUID, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_appointment(UUID, UUID, TIMESTAMPTZ) TO authenticated;


-- Automatically update updated_at whenever a record changes.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_updated_at()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER patient_medical_info_updated_at
BEFORE UPDATE ON public.patient_medical_info
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER visit_notes_updated_at
BEFORE UPDATE ON public.visit_notes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
