
-- Migration 4: Public booking and real-time updates
-- Patients book without an account by choosing a department and a slot.
-- The system assigns a free physician in that department, matches
-- returning patients by phone number, and returns a reference code.
-- Patients can look up, cancel or reschedule a booking using
-- their reference code together with their phone number.


-- Starting departments for the clinic.

INSERT INTO public.departments (name)
VALUES
    ('General Medicine'),
    ('Paediatrics'),
    ('Obstetrics & Gynaecology'),
    ('Dermatology')
ON CONFLICT (name) DO NOTHING;


-- Check whether a physician can take an appointment at a given time:
-- they are active, have no schedule exception that day, the 40 minutes
-- fit inside one of their working-hours blocks, and they have no
-- overlapping active appointment.
-- New bookings must also start on one of the 40-minute slot times;
-- reassignments skip that rule, because delay shifts can move an
-- appointment off the slot grid.
-- Internal helper: called only from other database functions.

CREATE OR REPLACE FUNCTION public.physician_is_available(
    p_physician_id UUID,
    p_scheduled_at TIMESTAMPTZ,
    p_exclude_appointment_id UUID DEFAULT NULL,
    p_require_slot_start BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SET search_path = ''
AS $$
    WITH slot AS (
        SELECT
            p_scheduled_at AT TIME ZONE 'Africa/Lagos' AS local_ts,
            (p_scheduled_at AT TIME ZONE 'Africa/Lagos')::DATE AS local_date
    )
    SELECT EXISTS (
        SELECT 1
        FROM public.staff AS s
        CROSS JOIN slot
        WHERE s.id = p_physician_id
          AND s.role = 'physician'
          AND s.is_active
          AND NOT EXISTS (
              SELECT 1
              FROM public.physician_schedule_exceptions AS e
              WHERE e.physician_id = s.id
                AND e.exception_date = slot.local_date
          )
          AND EXISTS (
              SELECT 1
              FROM public.physician_working_hours AS h
              WHERE h.physician_id = s.id
                AND h.day_of_week = EXTRACT(ISODOW FROM slot.local_date)::SMALLINT
                AND slot.local_ts >= slot.local_date + h.start_time
                AND slot.local_ts + INTERVAL '40 minutes'
                    <= slot.local_date + h.end_time
                AND (
                    NOT p_require_slot_start
                    OR EXTRACT(
                           EPOCH FROM slot.local_ts - (slot.local_date + h.start_time)
                       ) % 2400 = 0
                )
          )
          AND NOT EXISTS (
              SELECT 1
              FROM public.appointments AS a
              WHERE a.physician_id = s.id
                AND a.id IS DISTINCT FROM p_exclude_appointment_id
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
          )
    );
$$;

ALTER FUNCTION public.physician_is_available(UUID, TIMESTAMPTZ, UUID, BOOLEAN) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.physician_is_available(UUID, TIMESTAMPTZ, UUID, BOOLEAN)
FROM PUBLIC, anon, authenticated;


-- Pick a free physician in a department for a given time.
-- The physician with the fewest active appointments that day is
-- chosen, to spread the workload. p_exclude_physician_id leaves out
-- the current physician when reassigning.
-- Internal helper: called only from other database functions.

CREATE OR REPLACE FUNCTION public.pick_free_physician(
    p_department_id UUID,
    p_scheduled_at TIMESTAMPTZ,
    p_exclude_appointment_id UUID DEFAULT NULL,
    p_exclude_physician_id UUID DEFAULT NULL,
    p_require_slot_start BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE SQL
STABLE
SET search_path = ''
AS $$
    SELECT s.id
    FROM public.staff AS s
    WHERE s.role = 'physician'
      AND s.is_active
      AND s.department_id = p_department_id
      AND s.id IS DISTINCT FROM p_exclude_physician_id
      AND public.physician_is_available(
          s.id,
          p_scheduled_at,
          p_exclude_appointment_id,
          p_require_slot_start
      )
    ORDER BY
        (
            SELECT count(*)
            FROM public.appointments AS a
            WHERE a.physician_id = s.id
              AND a.status IN ('scheduled', 'checked_in', 'in_progress')
              AND (a.scheduled_at AT TIME ZONE 'Africa/Lagos')::DATE
                  = (p_scheduled_at AT TIME ZONE 'Africa/Lagos')::DATE
        ),
        s.id
    LIMIT 1;
$$;

ALTER FUNCTION public.pick_free_physician(UUID, TIMESTAMPTZ, UUID, UUID, BOOLEAN) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.pick_free_physician(UUID, TIMESTAMPTZ, UUID, UUID, BOOLEAN)
FROM PUBLIC, anon, authenticated;


-- List every slot in a department on a given date.
-- Slots that are taken, too soon, or too far ahead are returned
-- with is_available = FALSE so the booking page can disable them.
-- No physician or patient details are exposed.

CREATE OR REPLACE FUNCTION public.get_available_slots(
    p_department_id UUID,
    p_date DATE
)
RETURNS TABLE (
    slot_at TIMESTAMPTZ,
    is_available BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    WITH candidate_slots AS (
        SELECT DISTINCT
            ((p_date + h.start_time) + n.slot_number * INTERVAL '40 minutes')
                AT TIME ZONE 'Africa/Lagos' AS candidate_at
        FROM public.staff AS s
        JOIN public.physician_working_hours AS h
          ON h.physician_id = s.id
        CROSS JOIN LATERAL generate_series(
            0,
            EXTRACT(EPOCH FROM h.end_time - h.start_time)::INTEGER / 2400 - 1
        ) AS n(slot_number)
        WHERE s.role = 'physician'
          AND s.is_active
          AND s.department_id = p_department_id
          AND h.day_of_week = EXTRACT(ISODOW FROM p_date)::SMALLINT
    )
    SELECT
        c.candidate_at,
        c.candidate_at >= clock_timestamp() + INTERVAL '1 hour'
        AND c.candidate_at <= clock_timestamp() + INTERVAL '30 days'
        AND public.pick_free_physician(p_department_id, c.candidate_at)
            IS NOT NULL
    FROM candidate_slots AS c
    ORDER BY c.candidate_at;
$$;

ALTER FUNCTION public.get_available_slots(UUID, DATE) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_available_slots(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_slots(UUID, DATE) TO anon, authenticated;


-- Book an appointment from the public booking page.
-- Returning patients are matched by phone number; their existing
-- name and email are kept, so a booking cannot overwrite another
-- person's record. A patient may hold at most 3 upcoming appointments.

CREATE OR REPLACE FUNCTION public.book_public_appointment(
    p_department_id UUID,
    p_scheduled_at TIMESTAMPTZ,
    p_full_name TEXT,
    p_phone TEXT,
    p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
    booking_reference TEXT,
    appointment_time TIMESTAMPTZ,
    department_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_full_name TEXT;
    v_phone TEXT;
    v_department_name TEXT;
    v_patient_id UUID;
    v_physician_id UUID;
    v_reference_code TEXT;
BEGIN
    v_full_name := NULLIF(trim(p_full_name), '');
    v_phone := public.normalize_phone(p_phone);

    IF v_full_name IS NULL THEN
        RAISE EXCEPTION 'Full name is required';
    END IF;

    IF v_phone !~ '^\+[0-9]{8,15}$' THEN
        RAISE EXCEPTION 'A valid phone number is required';
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

    SELECT d.name
    INTO v_department_name
    FROM public.departments AS d
    WHERE d.id = p_department_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Department not found';
    END IF;

    -- Serialize bookings for the same department and time, so two
    -- patients cannot be given the same physician at once.
    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            p_department_id::TEXT || ':' || EXTRACT(EPOCH FROM p_scheduled_at)::TEXT,
            0
        )
    );

    -- Match a returning patient by phone, or register a new one.
    INSERT INTO public.patients (full_name, phone, email)
    VALUES (v_full_name, v_phone, NULLIF(trim(p_email), ''))
    ON CONFLICT (phone) DO NOTHING
    RETURNING id INTO v_patient_id;

    IF v_patient_id IS NULL THEN
        SELECT p.id
        INTO v_patient_id
        FROM public.patients AS p
        WHERE p.phone = v_phone;
    END IF;

    IF (
        SELECT count(*)
        FROM public.appointments AS a
        WHERE a.patient_id = v_patient_id
          AND a.status IN ('scheduled', 'checked_in')
          AND a.scheduled_at > clock_timestamp()
    ) >= 3 THEN
        RAISE EXCEPTION
            'You already have 3 upcoming appointments';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.appointments AS a
        WHERE a.patient_id = v_patient_id
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
            'You already have another appointment at that time';
    END IF;

    v_physician_id := public.pick_free_physician(p_department_id, p_scheduled_at);

    IF v_physician_id IS NULL THEN
        RAISE EXCEPTION 'That time is no longer available';
    END IF;

    INSERT INTO public.appointments (
        patient_id,
        physician_id,
        department_id,
        original_scheduled_at,
        scheduled_at
    )
    VALUES (
        v_patient_id,
        v_physician_id,
        p_department_id,
        p_scheduled_at,
        p_scheduled_at
    )
    RETURNING reference_code INTO v_reference_code;

    RETURN QUERY
    SELECT v_reference_code, p_scheduled_at, v_department_name;
END;
$$;

ALTER FUNCTION public.book_public_appointment(UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.book_public_appointment(UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_public_appointment(UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO anon, authenticated;


-- Look up a booking by reference code and phone number.
-- Returns no rows when either does not match, without saying which.

CREATE OR REPLACE FUNCTION public.get_public_appointment(
    p_reference_code TEXT,
    p_phone TEXT
)
RETURNS TABLE (
    booking_reference TEXT,
    appointment_time TIMESTAMPTZ,
    appointment_status TEXT,
    department_name TEXT,
    physician_name TEXT,
    time_under_review BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        a.reference_code,
        a.scheduled_at,
        a.status,
        d.name,
        s.full_name,
        a.reschedule_needs_review
    FROM public.appointments AS a
    JOIN public.patients AS p
      ON p.id = a.patient_id
    JOIN public.departments AS d
      ON d.id = a.department_id
    JOIN public.staff AS s
      ON s.id = a.physician_id
    WHERE a.reference_code = upper(trim(p_reference_code))
      AND p.phone = public.normalize_phone(p_phone);
$$;

ALTER FUNCTION public.get_public_appointment(TEXT, TEXT) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_public_appointment(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_appointment(TEXT, TEXT) TO anon, authenticated;


-- Cancel a booking by reference code and phone number.
-- Only upcoming scheduled appointments can be cancelled this way.

CREATE OR REPLACE FUNCTION public.cancel_public_appointment(
    p_reference_code TEXT,
    p_phone TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_appointment_id UUID;
    v_status TEXT;
    v_scheduled_at TIMESTAMPTZ;
BEGIN
    SELECT a.id, a.status, a.scheduled_at
    INTO v_appointment_id, v_status, v_scheduled_at
    FROM public.appointments AS a
    JOIN public.patients AS p
      ON p.id = a.patient_id
    WHERE a.reference_code = upper(trim(p_reference_code))
      AND p.phone = public.normalize_phone(p_phone)
    FOR UPDATE OF a;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found';
    END IF;

    IF v_status IS DISTINCT FROM 'scheduled'
       OR v_scheduled_at <= clock_timestamp() THEN
        RAISE EXCEPTION
            'Only upcoming scheduled appointments can be cancelled';
    END IF;

    UPDATE public.appointments
    SET
        status = 'cancelled',
        cancelled_at = clock_timestamp(),
        cancelled_by_patient = TRUE,
        cancellation_reason = NULLIF(trim(p_reason), '')
    WHERE id = v_appointment_id;
END;
$$;

ALTER FUNCTION public.cancel_public_appointment(TEXT, TEXT, TEXT) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.cancel_public_appointment(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_public_appointment(TEXT, TEXT, TEXT) TO anon, authenticated;


-- Reschedule a booking by reference code and phone number.
-- The appointment stays in its department; any free physician
-- there is assigned for the new time.

CREATE OR REPLACE FUNCTION public.reschedule_public_appointment(
    p_reference_code TEXT,
    p_phone TEXT,
    p_new_scheduled_at TIMESTAMPTZ
)
RETURNS TABLE (
    booking_reference TEXT,
    appointment_time TIMESTAMPTZ,
    department_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_appointment_id UUID;
    v_reference_code TEXT;
    v_patient_id UUID;
    v_department_id UUID;
    v_department_name TEXT;
    v_status TEXT;
    v_scheduled_at TIMESTAMPTZ;
    v_physician_id UUID;
BEGIN
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

    SELECT
        a.id,
        a.reference_code,
        a.patient_id,
        a.department_id,
        a.status,
        a.scheduled_at
    INTO
        v_appointment_id,
        v_reference_code,
        v_patient_id,
        v_department_id,
        v_status,
        v_scheduled_at
    FROM public.appointments AS a
    JOIN public.patients AS p
      ON p.id = a.patient_id
    WHERE a.reference_code = upper(trim(p_reference_code))
      AND p.phone = public.normalize_phone(p_phone)
    FOR UPDATE OF a;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found';
    END IF;

    IF v_status IS DISTINCT FROM 'scheduled'
       OR v_scheduled_at <= clock_timestamp() THEN
        RAISE EXCEPTION
            'Only upcoming scheduled appointments can be rescheduled';
    END IF;

    SELECT d.name
    INTO v_department_name
    FROM public.departments AS d
    WHERE d.id = v_department_id;

    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            v_department_id::TEXT || ':' || EXTRACT(EPOCH FROM p_new_scheduled_at)::TEXT,
            0
        )
    );

    IF EXISTS (
        SELECT 1
        FROM public.appointments AS a
        WHERE a.patient_id = v_patient_id
          AND a.id <> v_appointment_id
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
            'You already have another appointment at that time';
    END IF;

    v_physician_id := public.pick_free_physician(
        v_department_id,
        p_new_scheduled_at,
        v_appointment_id
    );

    IF v_physician_id IS NULL THEN
        RAISE EXCEPTION 'That time is no longer available';
    END IF;

    UPDATE public.appointments
    SET
        physician_id = v_physician_id,
        scheduled_at = p_new_scheduled_at,
        reschedule_needs_review = FALSE,
        reschedule_review_reason = NULL
    WHERE id = v_appointment_id;

    RETURN QUERY
    SELECT v_reference_code, p_new_scheduled_at, v_department_name;
END;
$$;

ALTER FUNCTION public.reschedule_public_appointment(TEXT, TEXT, TIMESTAMPTZ) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.reschedule_public_appointment(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reschedule_public_appointment(TEXT, TEXT, TIMESTAMPTZ) TO anon, authenticated;


-- Stream appointment changes to the front-desk and physician dashboards.
-- Supabase Realtime applies each viewer's RLS policies to these events.

ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
