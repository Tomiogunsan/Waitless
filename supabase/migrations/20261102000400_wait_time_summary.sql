-- Migration 10: Public wait-time summary
-- The booking page and the login page quote the clinic's average wait.
-- This returns only two averages, never patient or appointment details,
-- so visitors may call it.


-- Average minutes from check-in to the start of the consultation:
-- over the last 7 days, and over the same 7 days three months earlier.
-- Either value is NULL when there were no consultations in that window.

CREATE OR REPLACE FUNCTION public.get_wait_time_summary()
RETURNS TABLE (
    recent_minutes INTEGER,
    earlier_minutes INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        round(avg(EXTRACT(EPOCH FROM a.actual_started_at - a.checked_in_at) / 60)
            FILTER (WHERE a.actual_started_at >= now() - INTERVAL '7 days'))::INTEGER,
        round(avg(EXTRACT(EPOCH FROM a.actual_started_at - a.checked_in_at) / 60)
            FILTER (WHERE a.actual_started_at >= now() - INTERVAL '97 days'
                      AND a.actual_started_at < now() - INTERVAL '90 days'))::INTEGER
    FROM public.appointments AS a
    WHERE a.checked_in_at IS NOT NULL
      AND a.actual_started_at IS NOT NULL
      AND a.actual_started_at >= now() - INTERVAL '97 days';
$$;

ALTER FUNCTION public.get_wait_time_summary() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_wait_time_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wait_time_summary() TO anon, authenticated;
