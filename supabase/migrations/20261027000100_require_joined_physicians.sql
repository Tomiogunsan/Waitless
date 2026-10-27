
-- Migration 6: Only book physicians who have joined
-- An invited physician exists in staff (with working hours) as soon as the
-- invite is sent, but cannot see their queue until they accept it.
-- They must not be offered to patients or assigned appointments before then.
-- "Joined" means their invite was accepted: auth.users.email_confirmed_at is set.


-- Whether a staff member has accepted their invite.
-- Internal helper: called only from other database functions.

CREATE OR REPLACE FUNCTION public.staff_has_joined(
    p_staff_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM auth.users AS u
        WHERE u.id = p_staff_id
          AND u.email_confirmed_at IS NOT NULL
    );
$$;

ALTER FUNCTION public.staff_has_joined(UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.staff_has_joined(UUID)
FROM PUBLIC, anon, authenticated;


-- Same checks as before, plus: the physician has joined.
-- Used by public booking, patient rescheduling and reassignment.

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
          AND public.staff_has_joined(s.id)
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


-- Slot list for the booking page: only offer times of physicians who have
-- joined, so a department whose only doctor is still invited shows no slots.

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
          AND public.staff_has_joined(s.id)
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


-- Last line of defence: no appointment can be given to a physician who
-- hasn't joined, however it is created (front-desk booking, reassignment,
-- or anything added later).

CREATE OR REPLACE FUNCTION public.ensure_physician_has_joined()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NOT public.staff_has_joined(NEW.physician_id) THEN
        RAISE EXCEPTION
            'This physician has not accepted their invite yet, so they cannot be booked';
    END IF;

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.ensure_physician_has_joined() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.ensure_physician_has_joined()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER ensure_physician_has_joined_before_write
BEFORE INSERT OR UPDATE OF physician_id ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.ensure_physician_has_joined();
