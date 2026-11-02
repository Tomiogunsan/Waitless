-- Migration 7: Patient visit history for physicians
-- Physicians may read the visit notes of any patient they treat, including
-- notes written by colleagues, but they cannot read colleagues' appointments.
-- A note on its own carries no patient or visit date, so this function
-- joins them on the server and returns only what continuity of care needs.


-- A patient's past visits with notes, newest first.
-- Only a physician who treats the patient may call it.

CREATE OR REPLACE FUNCTION public.get_patient_visit_history(
    p_patient_id UUID
)
RETURNS TABLE (
    appointment_id UUID,
    visit_at TIMESTAMPTZ,
    physician_name TEXT,
    symptoms TEXT,
    diagnosis TEXT,
    prescription TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF public.current_staff_role() IS DISTINCT FROM 'physician' THEN
        RAISE EXCEPTION 'Only physicians can view visit history';
    END IF;

    IF NOT public.physician_treats_patient(p_patient_id) THEN
        RAISE EXCEPTION 'You do not treat this patient';
    END IF;

    RETURN QUERY
    SELECT
        a.id,
        COALESCE(a.actual_started_at, a.scheduled_at),
        s.full_name,
        n.symptoms,
        n.diagnosis,
        n.prescription
    FROM public.visit_notes AS n
    JOIN public.appointments AS a ON a.id = n.appointment_id
    JOIN public.staff AS s ON s.id = n.physician_id
    WHERE a.patient_id = p_patient_id
      AND a.status = 'completed'
    ORDER BY COALESCE(a.actual_started_at, a.scheduled_at) DESC;
END;
$$;

ALTER FUNCTION public.get_patient_visit_history(UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_patient_visit_history(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_patient_visit_history(UUID) TO authenticated;
