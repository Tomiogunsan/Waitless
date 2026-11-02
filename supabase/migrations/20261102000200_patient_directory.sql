-- Migration 8: Patient directory
-- The patients list shows each patient's last visit and next appointment.
-- Working that out in the browser would mean downloading every appointment,
-- so this view does it in the database.
-- security_invoker makes the view run with the caller's permissions, so the
-- existing row level security still applies: physicians see only the
-- patients they treat, and only the dates of their own appointments.


CREATE VIEW public.patient_directory
WITH (security_invoker = true)
AS
SELECT
    p.id,
    p.full_name,
    p.phone,
    p.email,
    p.created_at,
    (
        SELECT max(a.scheduled_at)
        FROM public.appointments AS a
        WHERE a.patient_id = p.id
          AND a.status = 'completed'
    ) AS last_visit_at,
    (
        SELECT min(a.scheduled_at)
        FROM public.appointments AS a
        WHERE a.patient_id = p.id
          AND a.status IN ('scheduled', 'checked_in', 'in_progress')
          AND a.scheduled_at >=
              date_trunc('day', now() AT TIME ZONE 'Africa/Lagos')
                  AT TIME ZONE 'Africa/Lagos'
    ) AS next_appointment_at
FROM public.patients AS p;

REVOKE ALL ON TABLE public.patient_directory FROM anon, authenticated;
GRANT SELECT ON TABLE public.patient_directory TO authenticated;
