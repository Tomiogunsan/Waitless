-- Migration 9: Admin reporting
-- Two read-only functions for the admin pages:
--   * the staff directory, which needs each account's email and invite
--     status from auth.users (not readable by the app), and
--   * daily appointment statistics for the analytics dashboard, added up in
--     the database instead of downloading every appointment.
-- Only active administrators may call them.


-- Every staff member with their sign-in email and invite status.

CREATE OR REPLACE FUNCTION public.get_staff_directory()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    department_id UUID,
    is_active BOOLEAN,
    invite_pending BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can view the staff directory';
    END IF;

    RETURN QUERY
    SELECT
        s.id,
        s.full_name,
        u.email::TEXT,
        s.role,
        s.department_id,
        s.is_active,
        u.email_confirmed_at IS NULL,
        u.created_at
    FROM public.staff AS s
    JOIN auth.users AS u ON u.id = s.id
    ORDER BY s.full_name;
END;
$$;

ALTER FUNCTION public.get_staff_directory() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_staff_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_directory() TO authenticated;


-- One row per Lagos calendar day and department between two dates
-- (inclusive). Wait time is check-in to the start of the consultation;
-- the client divides wait_minutes by waited for an average.

CREATE OR REPLACE FUNCTION public.get_appointment_stats(
    p_from DATE,
    p_to DATE
)
RETURNS TABLE (
    day DATE,
    department_id UUID,
    appointments INTEGER,
    completed INTEGER,
    no_shows INTEGER,
    wait_minutes NUMERIC,
    waited INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can view appointment statistics';
    END IF;

    IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
        RAISE EXCEPTION 'Choose a valid date range';
    END IF;

    RETURN QUERY
    SELECT
        (a.scheduled_at AT TIME ZONE 'Africa/Lagos')::DATE,
        a.department_id,
        count(*)::INTEGER,
        (count(*) FILTER (WHERE a.status = 'completed'))::INTEGER,
        (count(*) FILTER (WHERE a.status = 'no_show'))::INTEGER,
        COALESCE(
            sum(EXTRACT(EPOCH FROM a.actual_started_at - a.checked_in_at) / 60)
                FILTER (WHERE a.checked_in_at IS NOT NULL AND a.actual_started_at IS NOT NULL),
            0
        )::NUMERIC,
        (count(*) FILTER (
            WHERE a.checked_in_at IS NOT NULL AND a.actual_started_at IS NOT NULL
        ))::INTEGER
    FROM public.appointments AS a
    WHERE a.scheduled_at >= p_from::TIMESTAMP AT TIME ZONE 'Africa/Lagos'
      AND a.scheduled_at < (p_to + 1)::TIMESTAMP AT TIME ZONE 'Africa/Lagos'
    GROUP BY 1, 2
    ORDER BY 1, 2;
END;
$$;

ALTER FUNCTION public.get_appointment_stats(DATE, DATE) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_appointment_stats(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_appointment_stats(DATE, DATE) TO authenticated;
