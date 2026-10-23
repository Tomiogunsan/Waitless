
-- Migration 5: Staff management
-- Administrators can deactivate, reactivate, and change the role of
-- other staff members. Administrators cannot change their own account,
-- so the clinic always keeps at least one active administrator.
--
-- The manage-staff Edge Function also blocks sign-in for deactivated
-- accounts; these functions control what the account can access.


-- Lock the caller's and the target's staff rows in a fixed order,
-- then confirm the caller is still an active administrator.
-- Prevents two administrators from deactivating each other at once.
-- Internal helper: called only from the functions below.

CREATE OR REPLACE FUNCTION public.lock_staff_for_admin_change(
    p_staff_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF p_staff_id IS NULL THEN
        RAISE EXCEPTION 'A staff member is required';
    END IF;

    IF p_staff_id = (SELECT auth.uid()) THEN
        RAISE EXCEPTION 'You cannot change your own account';
    END IF;

    PERFORM s.id
    FROM public.staff AS s
    WHERE s.id IN (p_staff_id, (SELECT auth.uid()))
    ORDER BY s.id
    FOR UPDATE;

    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can manage staff';
    END IF;
END;
$$;

ALTER FUNCTION public.lock_staff_for_admin_change(UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.lock_staff_for_admin_change(UUID)
FROM PUBLIC, anon, authenticated;


-- Deactivate or reactivate a staff member.
-- A physician cannot be deactivated while they still have
-- scheduled, checked-in, or in-progress appointments.
-- Calling it again with the same value does nothing.

CREATE OR REPLACE FUNCTION public.set_staff_active(
    p_staff_id UUID,
    p_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_is_active BOOLEAN;
    v_active_appointments INTEGER;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can manage staff';
    END IF;

    IF p_active IS NULL THEN
        RAISE EXCEPTION 'Specify whether the account should be active';
    END IF;

    PERFORM public.lock_staff_for_admin_change(p_staff_id);

    SELECT s.role, s.is_active
    INTO v_role, v_is_active
    FROM public.staff AS s
    WHERE s.id = p_staff_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Staff member not found';
    END IF;

    IF v_is_active = p_active THEN
        RETURN;
    END IF;

    IF NOT p_active AND v_role = 'physician' THEN
        SELECT count(*)
        INTO v_active_appointments
        FROM public.appointments AS a
        WHERE a.physician_id = p_staff_id
          AND a.status IN ('scheduled', 'checked_in', 'in_progress');

        IF v_active_appointments > 0 THEN
            RAISE EXCEPTION
                'This physician still has % active appointment(s); reassign, cancel or complete them first',
                v_active_appointments;
        END IF;
    END IF;

    UPDATE public.staff
    SET
        is_active = p_active,
        deactivated_at = CASE
            WHEN p_active THEN NULL
            ELSE clock_timestamp()
        END
    WHERE id = p_staff_id;
END;
$$;

ALTER FUNCTION public.set_staff_active(UUID, BOOLEAN) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.set_staff_active(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_staff_active(UUID, BOOLEAN) TO authenticated;


-- Change a staff member's role, or move a physician to another department.
-- Becoming a physician requires a department and automatically creates
-- the standard clinic working hours (see migration 3).
-- A physician cannot change role or department while they have active
-- appointments, and a physician with any appointment history cannot
-- take another role, so clinical records keep a valid physician.

CREATE OR REPLACE FUNCTION public.change_staff_role(
    p_staff_id UUID,
    p_role TEXT,
    p_department_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_current_role TEXT;
    v_current_department_id UUID;
    v_active_appointments INTEGER;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can manage staff';
    END IF;

    IF p_role IS NULL
       OR p_role NOT IN ('physician', 'front_desk', 'admin') THEN
        RAISE EXCEPTION
            'Role must be one of: physician, front_desk, admin';
    END IF;

    IF p_role = 'physician' AND p_department_id IS NULL THEN
        RAISE EXCEPTION 'Physicians must be assigned a department';
    END IF;

    IF p_role <> 'physician' AND p_department_id IS NOT NULL THEN
        RAISE EXCEPTION 'Only physicians belong to a department';
    END IF;

    IF p_department_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM public.departments AS d
        WHERE d.id = p_department_id
    ) THEN
        RAISE EXCEPTION 'Department not found';
    END IF;

    PERFORM public.lock_staff_for_admin_change(p_staff_id);

    SELECT s.role, s.department_id
    INTO v_current_role, v_current_department_id
    FROM public.staff AS s
    WHERE s.id = p_staff_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Staff member not found';
    END IF;

    IF v_current_role = p_role
       AND v_current_department_id IS NOT DISTINCT FROM p_department_id THEN
        RETURN;
    END IF;

    IF v_current_role = 'physician' THEN
        SELECT count(*)
        INTO v_active_appointments
        FROM public.appointments AS a
        WHERE a.physician_id = p_staff_id
          AND a.status IN ('scheduled', 'checked_in', 'in_progress');

        IF v_active_appointments > 0 THEN
            RAISE EXCEPTION
                'This physician still has % active appointment(s); reassign, cancel or complete them first',
                v_active_appointments;
        END IF;
    END IF;

    IF v_current_role = 'physician' AND p_role <> 'physician' THEN
        IF EXISTS (
            SELECT 1
            FROM public.appointments AS a
            WHERE a.physician_id = p_staff_id
        ) THEN
            RAISE EXCEPTION
                'A physician with appointment history cannot take another role; deactivate this account instead';
        END IF;

        -- Remove schedule rows that only apply to physicians.
        DELETE FROM public.physician_working_hours
        WHERE physician_id = p_staff_id;

        DELETE FROM public.physician_schedule_exceptions
        WHERE physician_id = p_staff_id;
    END IF;

    UPDATE public.staff
    SET
        role = p_role,
        department_id = p_department_id
    WHERE id = p_staff_id;
END;
$$;

ALTER FUNCTION public.change_staff_role(UUID, TEXT, UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.change_staff_role(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_staff_role(UUID, TEXT, UUID) TO authenticated;


-- Move one appointment to another physician at the same time.
-- With no physician given, a free physician in the same department
-- is chosen automatically. Only scheduled or checked-in appointments
-- can be moved. Front-desk staff and administrators may do this.
-- Returns the newly assigned physician.

CREATE OR REPLACE FUNCTION public.reassign_appointment(
    p_appointment_id UUID,
    p_new_physician_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_current_physician_id UUID;
    v_department_id UUID;
    v_status TEXT;
    v_scheduled_at TIMESTAMPTZ;
    v_new_physician_id UUID;
BEGIN
    v_role := public.current_staff_role();

    IF v_role IS DISTINCT FROM 'front_desk'
       AND v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION
            'Only front-desk staff or administrators can reassign appointments';
    END IF;

    SELECT a.physician_id, a.department_id, a.status, a.scheduled_at
    INTO v_current_physician_id, v_department_id, v_status, v_scheduled_at
    FROM public.appointments AS a
    WHERE a.id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found';
    END IF;

    IF v_status NOT IN ('scheduled', 'checked_in') THEN
        RAISE EXCEPTION
            'Only scheduled or checked-in appointments can be reassigned';
    END IF;

    -- Same lock as public booking, so both cannot claim one physician.
    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            v_department_id::TEXT || ':' || EXTRACT(EPOCH FROM v_scheduled_at)::TEXT,
            0
        )
    );

    IF p_new_physician_id IS NULL THEN
        v_new_physician_id := public.pick_free_physician(
            v_department_id,
            v_scheduled_at,
            p_appointment_id,
            v_current_physician_id,
            FALSE
        );

        IF v_new_physician_id IS NULL THEN
            RAISE EXCEPTION
                'No other physician in this department is free at this time';
        END IF;
    ELSE
        IF p_new_physician_id = v_current_physician_id THEN
            RAISE EXCEPTION
                'The appointment is already assigned to this physician';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM public.staff AS s
            WHERE s.id = p_new_physician_id
              AND s.role = 'physician'
              AND s.is_active
              AND s.department_id = v_department_id
        ) THEN
            RAISE EXCEPTION
                'The new physician must be an active physician in the same department';
        END IF;

        IF NOT public.physician_is_available(
            p_new_physician_id,
            v_scheduled_at,
            p_appointment_id,
            FALSE
        ) THEN
            RAISE EXCEPTION
                'That physician is not available at this time';
        END IF;

        v_new_physician_id := p_new_physician_id;
    END IF;

    -- A successful reassignment resolves any pending scheduling review.
    UPDATE public.appointments
    SET
        physician_id = v_new_physician_id,
        reschedule_needs_review = FALSE,
        reschedule_review_reason = NULL
    WHERE id = p_appointment_id;

    RETURN v_new_physician_id;
END;
$$;

ALTER FUNCTION public.reassign_appointment(UUID, UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.reassign_appointment(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reassign_appointment(UUID, UUID) TO authenticated;


-- Move all of a physician's scheduled and checked-in appointments to
-- other free physicians in the same department, e.g. before
-- deactivating them. Appointments with no free physician stay where
-- they are and are flagged for staff review. In-progress consultations
-- are left alone. Front-desk staff and administrators may do this.

CREATE OR REPLACE FUNCTION public.reassign_physician_appointments(
    p_physician_id UUID
)
RETURNS TABLE (
    reassigned_count INTEGER,
    needs_review_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_appointment RECORD;
    v_new_physician_id UUID;
    v_reassigned INTEGER := 0;
    v_needs_review INTEGER := 0;
BEGIN
    v_role := public.current_staff_role();

    IF v_role IS DISTINCT FROM 'front_desk'
       AND v_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION
            'Only front-desk staff or administrators can reassign appointments';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.staff AS s
        WHERE s.id = p_physician_id
          AND s.role = 'physician'
    ) THEN
        RAISE EXCEPTION 'Physician not found';
    END IF;

    FOR v_appointment IN
        SELECT a.id, a.department_id, a.scheduled_at
        FROM public.appointments AS a
        WHERE a.physician_id = p_physician_id
          AND a.status IN ('scheduled', 'checked_in')
        ORDER BY a.scheduled_at, a.id
        FOR UPDATE
    LOOP
        PERFORM pg_advisory_xact_lock(
            hashtextextended(
                v_appointment.department_id::TEXT || ':'
                    || EXTRACT(EPOCH FROM v_appointment.scheduled_at)::TEXT,
                0
            )
        );

        v_new_physician_id := public.pick_free_physician(
            v_appointment.department_id,
            v_appointment.scheduled_at,
            v_appointment.id,
            p_physician_id,
            FALSE
        );

        IF v_new_physician_id IS NULL THEN
            UPDATE public.appointments
            SET
                reschedule_needs_review = TRUE,
                reschedule_review_reason =
                    'Physician unavailable and no other physician in the department is free at this time; please reschedule or cancel.'
            WHERE id = v_appointment.id;

            v_needs_review := v_needs_review + 1;
        ELSE
            UPDATE public.appointments
            SET
                physician_id = v_new_physician_id,
                reschedule_needs_review = FALSE,
                reschedule_review_reason = NULL
            WHERE id = v_appointment.id;

            v_reassigned := v_reassigned + 1;
        END IF;
    END LOOP;

    RETURN QUERY SELECT v_reassigned, v_needs_review;
END;
$$;

ALTER FUNCTION public.reassign_physician_appointments(UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.reassign_physician_appointments(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reassign_physician_appointments(UUID) TO authenticated;
