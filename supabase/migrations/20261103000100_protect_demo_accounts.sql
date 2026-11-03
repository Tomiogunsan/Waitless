-- Migration 11: Protect the demo accounts
-- The public demo shares its admin login, so anyone could otherwise rename,
-- re-role or deactivate the accounts other visitors sign in with.
-- The seed marks those accounts; every change path (change_staff_role,
-- set_staff_active behind the manage-staff Edge Function, or a direct
-- update) goes through this trigger, so one rule covers them all.


ALTER TABLE public.staff
ADD COLUMN is_demo_account BOOLEAN NOT NULL DEFAULT FALSE;


CREATE OR REPLACE FUNCTION public.protect_demo_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF OLD.is_demo_account AND (
        NEW.full_name IS DISTINCT FROM OLD.full_name
        OR NEW.role IS DISTINCT FROM OLD.role
        OR NEW.department_id IS DISTINCT FROM OLD.department_id
        OR NEW.is_active IS DISTINCT FROM OLD.is_active
    ) THEN
        RAISE EXCEPTION
            'Demo accounts can''t be changed. Invite a new staff member to try this.';
    END IF;

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.protect_demo_accounts() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.protect_demo_accounts()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER protect_demo_accounts_before_update
BEFORE UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.protect_demo_accounts();


-- change_staff_role and set_staff_active both start here, so a demo account
-- is refused up front instead of after other checks (e.g. "reassign their
-- appointments first", which would be wasted effort).

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

    IF EXISTS (
        SELECT 1 FROM public.staff AS s
        WHERE s.id = p_staff_id AND s.is_demo_account
    ) THEN
        RAISE EXCEPTION
            'Demo accounts can''t be changed. Invite a new staff member to try this.';
    END IF;
END;
$$;


-- The staff directory also reports which accounts are protected.
-- The return type changes, so the function is recreated.

DROP FUNCTION public.get_staff_directory();

CREATE FUNCTION public.get_staff_directory()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    department_id UUID,
    is_active BOOLEAN,
    invite_pending BOOLEAN,
    is_demo_account BOOLEAN,
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
        s.is_demo_account,
        u.created_at
    FROM public.staff AS s
    JOIN auth.users AS u ON u.id = s.id
    ORDER BY s.full_name;
END;
$$;

ALTER FUNCTION public.get_staff_directory() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_staff_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_directory() TO authenticated;
