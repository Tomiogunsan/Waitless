-- End-to-end tests for the main clinic flows.
-- Run with: supabase test db
-- Everything runs inside one transaction and is rolled back at the end.
--
-- Fixed test IDs:
--   Admins:      ...a1, ...a2        Front desk: ...b1
--   Physicians:  ...c1, ...c2 (General Medicine), ...c3 (Dermatology)
--   Patients:    ...e1 - ...e5       Appointments: ...f1 - ...f5

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(61);


-- =========================================
-- Test helpers
-- =========================================

CREATE SCHEMA tests;
GRANT USAGE ON SCHEMA tests TO anon, authenticated;

-- Values carried between steps, e.g. booking reference codes.
CREATE TABLE tests.ctx (
    key TEXT PRIMARY KEY,
    val TEXT NOT NULL
);
GRANT ALL ON TABLE tests.ctx TO anon, authenticated;

-- Act as a signed-in user. Call RESET ROLE first when switching users.
CREATE FUNCTION tests.authenticate_as(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config(
        'request.jwt.claims',
        json_build_object('sub', p_user_id, 'role', 'authenticated')::TEXT,
        TRUE
    );
    PERFORM set_config('role', 'authenticated', TRUE);
END;
$$;

-- Act as a visitor to the public booking page.
CREATE FUNCTION tests.authenticate_as_anon()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('request.jwt.claims', '{"role": "anon"}', TRUE);
    PERFORM set_config('role', 'anon', TRUE);
END;
$$;

-- A time on next week's Monday (Lagos), always 1-30 days ahead.
CREATE FUNCTION tests.monday_at(p_time TIME)
RETURNS TIMESTAMPTZ
LANGUAGE SQL
STABLE
AS $$
    SELECT (
        (now() AT TIME ZONE 'Africa/Lagos')::DATE
        + (8 - EXTRACT(ISODOW FROM now() AT TIME ZONE 'Africa/Lagos')::INTEGER)
        + p_time
    ) AT TIME ZONE 'Africa/Lagos';
$$;

-- Delay-shift tests need "now" well away from midnight in Lagos.
INSERT INTO tests.ctx (key, val)
VALUES (
    'delay_ok',
    (EXTRACT(HOUR FROM now() AT TIME ZONE 'Africa/Lagos') BETWEEN 2 AND 21)::TEXT
);


-- =========================================
-- Setup: staff accounts
-- =========================================

INSERT INTO auth.users (id, email, aud, role)
VALUES
    ('00000000-0000-0000-0000-0000000000a1', 'admin1@test.local', 'authenticated', 'authenticated'),
    ('00000000-0000-0000-0000-0000000000a2', 'admin2@test.local', 'authenticated', 'authenticated'),
    ('00000000-0000-0000-0000-0000000000b1', 'desk1@test.local', 'authenticated', 'authenticated'),
    ('00000000-0000-0000-0000-0000000000c1', 'doc1@test.local', 'authenticated', 'authenticated'),
    ('00000000-0000-0000-0000-0000000000c2', 'doc2@test.local', 'authenticated', 'authenticated'),
    ('00000000-0000-0000-0000-0000000000c3', 'doc3@test.local', 'authenticated', 'authenticated');

INSERT INTO public.staff (id, full_name, role, department_id)
VALUES
    ('00000000-0000-0000-0000-0000000000a1', 'Admin One', 'admin', NULL),
    ('00000000-0000-0000-0000-0000000000a2', 'Admin Two', 'admin', NULL),
    ('00000000-0000-0000-0000-0000000000b1', 'Desk One', 'front_desk', NULL),
    ('00000000-0000-0000-0000-0000000000c1', 'Dr One', 'physician',
        (SELECT id FROM public.departments WHERE name = 'General Medicine')),
    ('00000000-0000-0000-0000-0000000000c2', 'Dr Two', 'physician',
        (SELECT id FROM public.departments WHERE name = 'General Medicine')),
    ('00000000-0000-0000-0000-0000000000c3', 'Dr Three', 'physician',
        (SELECT id FROM public.departments WHERE name = 'Dermatology'));


-- =========================================
-- 1. Schema rules and automatic setup
-- =========================================

SELECT is(
    (SELECT count(*) FROM public.physician_working_hours
     WHERE physician_id = '00000000-0000-0000-0000-0000000000c1'),
    10::BIGINT,
    'New physicians automatically get 10 working-hour blocks (Mon-Fri, morning and afternoon)'
);

SELECT throws_ok(
    $$INSERT INTO public.physician_working_hours (physician_id, day_of_week, start_time, end_time)
      VALUES ('00000000-0000-0000-0000-0000000000c3', 6, '09:00', '10:00')$$,
    '23514',
    NULL,
    'Working hours cannot be set on a Saturday'
);

SELECT throws_ok(
    $$INSERT INTO public.physician_working_hours (physician_id, day_of_week, start_time, end_time)
      VALUES ('00000000-0000-0000-0000-0000000000c3', 1, '11:00', '13:30')$$,
    '23514',
    NULL,
    'Working hours cannot cover the lunch break'
);

INSERT INTO public.patients (full_name, phone)
VALUES ('Phone Format', '0801 111 1111');

SELECT is(
    (SELECT phone FROM public.patients WHERE full_name = 'Phone Format'),
    '+2348011111111',
    'Local Nigerian phone numbers are stored in international form'
);

SELECT throws_ok(
    $$INSERT INTO public.patients (full_name, phone) VALUES ('Duplicate', '+234 801 111 1111')$$,
    '23505',
    NULL,
    'The same phone number in a different format is rejected as a duplicate'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'appointments'
    ),
    'Appointments are published to Supabase Realtime'
);


-- =========================================
-- 2. Public booking (no login)
-- =========================================

SELECT tests.authenticate_as_anon();

SELECT ok(
    (SELECT count(*) FROM public.departments) > 0,
    'Visitors can list departments'
);

SELECT throws_ok(
    'SELECT * FROM public.patients',
    '42501',
    NULL,
    'Visitors cannot read patient records'
);

SELECT is(
    (SELECT count(*) FROM public.get_available_slots(
        (SELECT id FROM public.departments WHERE name = 'General Medicine'),
        (tests.monday_at('00:00') AT TIME ZONE 'Africa/Lagos')::DATE
    )),
    11::BIGINT,
    'A department shows 11 slots on a weekday'
);

SELECT is(
    (SELECT count(*) FROM public.get_available_slots(
        (SELECT id FROM public.departments WHERE name = 'General Medicine'),
        (tests.monday_at('00:00') AT TIME ZONE 'Africa/Lagos')::DATE
    ) WHERE is_available),
    11::BIGINT,
    'All slots start out available'
);

INSERT INTO tests.ctx (key, val)
SELECT 'r1', booking_reference
FROM public.book_public_appointment(
    (SELECT id FROM public.departments WHERE name = 'General Medicine'),
    tests.monday_at('08:40'),
    'Ada Public',
    '08022222222'
);

SELECT matches(
    (SELECT val FROM tests.ctx WHERE key = 'r1'),
    '^CLN-[0-9A-F]{12}$',
    'Public booking returns a reference code'
);

SELECT is(
    (SELECT is_available FROM public.get_available_slots(
        (SELECT id FROM public.departments WHERE name = 'General Medicine'),
        (tests.monday_at('00:00') AT TIME ZONE 'Africa/Lagos')::DATE
    ) WHERE slot_at = tests.monday_at('08:40')),
    TRUE,
    'A slot stays available while another physician in the department is free'
);

INSERT INTO tests.ctx (key, val)
SELECT 'r_other', booking_reference
FROM public.book_public_appointment(
    (SELECT id FROM public.departments WHERE name = 'General Medicine'),
    tests.monday_at('08:40'),
    'Bola Public',
    '08033333333'
);

SELECT is(
    (SELECT is_available FROM public.get_available_slots(
        (SELECT id FROM public.departments WHERE name = 'General Medicine'),
        (tests.monday_at('00:00') AT TIME ZONE 'Africa/Lagos')::DATE
    ) WHERE slot_at = tests.monday_at('08:40')),
    FALSE,
    'A slot is shown as taken once every physician is booked'
);

SELECT throws_ok(
    $$SELECT * FROM public.book_public_appointment(
        (SELECT id FROM public.departments WHERE name = 'General Medicine'),
        tests.monday_at('08:40'), 'Chi Public', '08044444444')$$,
    'P0001',
    'That time is no longer available',
    'A fully booked slot cannot be booked'
);

SELECT throws_ok(
    $$SELECT * FROM public.book_public_appointment(
        (SELECT id FROM public.departments WHERE name = 'General Medicine'),
        tests.monday_at('08:50'), 'Chi Public', '08044444444')$$,
    'P0001',
    'That time is no longer available',
    'A time that is not a 40-minute slot start cannot be booked'
);

-- Same patient, phone typed differently, different name.
INSERT INTO tests.ctx (key, val)
SELECT 'r2', booking_reference
FROM public.book_public_appointment(
    (SELECT id FROM public.departments WHERE name = 'General Medicine'),
    tests.monday_at('09:20'),
    'Someone Else',
    '+234 802 222 2222'
);

SELECT throws_ok(
    $$SELECT * FROM public.book_public_appointment(
        (SELECT id FROM public.departments WHERE name = 'Dermatology'),
        tests.monday_at('08:40'), 'Ada Public', '08022222222')$$,
    'P0001',
    'You already have another appointment at that time',
    'A patient cannot be double-booked across departments'
);

INSERT INTO tests.ctx (key, val)
SELECT 'r3', booking_reference
FROM public.book_public_appointment(
    (SELECT id FROM public.departments WHERE name = 'General Medicine'),
    tests.monday_at('10:00'),
    'Ada Public',
    '08022222222'
);

SELECT throws_ok(
    $$SELECT * FROM public.book_public_appointment(
        (SELECT id FROM public.departments WHERE name = 'General Medicine'),
        tests.monday_at('10:40'), 'Ada Public', '08022222222')$$,
    'P0001',
    'You already have 3 upcoming appointments',
    'A patient can hold at most 3 upcoming appointments'
);

SELECT is_empty(
    $$SELECT * FROM public.get_public_appointment(
        (SELECT val FROM tests.ctx WHERE key = 'r1'), '08000000000')$$,
    'Lookup with the wrong phone number returns nothing'
);

SELECT is(
    (SELECT appointment_status FROM public.get_public_appointment(
        (SELECT val FROM tests.ctx WHERE key = 'r1'), '0802 222 2222')),
    'scheduled',
    'Lookup with the reference code and phone number finds the booking'
);

SELECT is(
    (SELECT appointment_time FROM public.reschedule_public_appointment(
        (SELECT val FROM tests.ctx WHERE key = 'r3'),
        '08022222222',
        tests.monday_at('11:20'))),
    tests.monday_at('11:20'),
    'A patient can reschedule their own booking'
);

SELECT lives_ok(
    $$SELECT public.cancel_public_appointment(
        (SELECT val FROM tests.ctx WHERE key = 'r2'), '08022222222')$$,
    'A patient can cancel their own booking'
);

SELECT is(
    (SELECT appointment_status FROM public.get_public_appointment(
        (SELECT val FROM tests.ctx WHERE key = 'r2'), '08022222222')),
    'cancelled',
    'The cancelled booking shows as cancelled'
);

RESET ROLE;

SELECT is(
    (SELECT full_name FROM public.patients WHERE phone = '+2348022222222'),
    'Ada Public',
    'A returning patient is matched by phone and their name is not overwritten'
);


-- =========================================
-- 3. Staff access rules
-- =========================================

SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000b1');

SELECT is(
    (SELECT count(*) FROM public.appointments),
    4::BIGINT,
    'Front desk sees every appointment'
);

SELECT is_empty(
    'SELECT * FROM public.patient_medical_info',
    'Front desk cannot read medical information'
);

SELECT throws_ok(
    $$INSERT INTO public.appointments (patient_id) VALUES (gen_random_uuid())$$,
    '42501',
    NULL,
    'Front desk cannot write appointments directly'
);

SELECT lives_ok(
    $$INSERT INTO public.patients (full_name, phone) VALUES ('Walk In', '08099999999')$$,
    'Front desk can register a patient'
);

SELECT throws_ok(
    $$INSERT INTO public.patients (full_name, phone, created_at)
      VALUES ('Backdated', '08098888888', '2000-01-01')$$,
    '42501',
    NULL,
    'Front desk cannot set system columns such as created_at'
);

RESET ROLE;
SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000c1');

SELECT is(
    (SELECT count(*) FROM public.appointments
     WHERE physician_id <> '00000000-0000-0000-0000-0000000000c1'),
    0::BIGINT,
    'A physician sees only their own appointments'
);

SELECT is(
    (SELECT count(*) FROM public.patient_medical_info),
    1::BIGINT,
    'A physician sees medical information only for patients they treat'
);

SELECT throws_ok(
    $$SELECT public.book_appointment(
        '00000000-0000-0000-0000-0000000000e1',
        '00000000-0000-0000-0000-0000000000c1',
        now() + INTERVAL '2 days')$$,
    'P0001',
    'Only front-desk staff or administrators can book appointments',
    'Physicians cannot book appointments'
);

RESET ROLE;
SELECT tests.authenticate_as_anon();

SELECT throws_ok(
    $$SELECT public.check_in_appointment(gen_random_uuid())$$,
    '42501',
    NULL,
    'Visitors cannot call staff workflow functions'
);

RESET ROLE;

-- The database itself blocks overlapping appointments for a physician.
SET CONSTRAINTS public.appointments_no_physician_overlap IMMEDIATE;

SELECT throws_ok(
    $$INSERT INTO public.appointments (patient_id, physician_id, department_id, original_scheduled_at, scheduled_at)
      VALUES (
          (SELECT id FROM public.patients WHERE phone = '+2348011111111'),
          '00000000-0000-0000-0000-0000000000c2',
          (SELECT id FROM public.departments WHERE name = 'General Medicine'),
          tests.monday_at('08:50'),
          tests.monday_at('08:50'))$$,
    '23P01',
    NULL,
    'The exclusion constraint blocks overlapping physician appointments'
);

SET CONSTRAINTS public.appointments_no_physician_overlap DEFERRED;


-- =========================================
-- 4. Consultation flow (today)
-- =========================================

INSERT INTO public.patients (id, full_name, phone)
VALUES
    ('00000000-0000-0000-0000-0000000000e1', 'Patient X', '08050000001'),
    ('00000000-0000-0000-0000-0000000000e2', 'Patient Y', '08050000002'),
    ('00000000-0000-0000-0000-0000000000e3', 'Patient Z', '08050000003'),
    ('00000000-0000-0000-0000-0000000000e4', 'Patient W', '08050000004'),
    ('00000000-0000-0000-0000-0000000000e5', 'Patient V', '08050000005');

-- Appointment A: today, shortly before now, for Dr One.
INSERT INTO public.appointments (
    id, patient_id, physician_id, department_id, original_scheduled_at, scheduled_at
)
SELECT
    '00000000-0000-0000-0000-0000000000f1',
    '00000000-0000-0000-0000-0000000000e1',
    '00000000-0000-0000-0000-0000000000c1',
    (SELECT id FROM public.departments WHERE name = 'General Medicine'),
    t.at,
    t.at
FROM (
    SELECT GREATEST(
        now() - INTERVAL '45 minutes',
        date_trunc('day', now() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos'
    ) AS at
) AS t;

SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000b1');

SELECT lives_ok(
    $$SELECT public.check_in_appointment('00000000-0000-0000-0000-0000000000f1')$$,
    'Front desk checks the patient in'
);

RESET ROLE;
SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000c2');

SELECT throws_ok(
    $$SELECT public.start_consultation('00000000-0000-0000-0000-0000000000f1')$$,
    'P0001',
    'You are not assigned to this appointment',
    'Another physician cannot start the consultation'
);

RESET ROLE;
SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000c1');

SELECT throws_ok(
    $$SELECT public.save_visit_note('00000000-0000-0000-0000-0000000000f1', 'Cough', 'Cold')$$,
    'P0001',
    'Visit notes can only be saved during an active consultation',
    'A note cannot be saved before the consultation starts'
);

SELECT lives_ok(
    $$SELECT public.start_consultation('00000000-0000-0000-0000-0000000000f1')$$,
    'The assigned physician starts the consultation'
);

SELECT throws_ok(
    $$SELECT public.complete_consultation('00000000-0000-0000-0000-0000000000f1')$$,
    'P0001',
    'Save a visit note with symptoms and diagnosis before completing',
    'A consultation cannot be completed without a note'
);

SELECT lives_ok(
    $$SELECT public.save_visit_note('00000000-0000-0000-0000-0000000000f1', 'Cough', 'Common cold', 'Rest and fluids')$$,
    'The physician saves a visit note'
);

SELECT lives_ok(
    $$SELECT public.complete_consultation('00000000-0000-0000-0000-0000000000f1')$$,
    'The physician completes the consultation'
);

SELECT is(
    (SELECT status FROM public.appointments WHERE id = '00000000-0000-0000-0000-0000000000f1'),
    'completed',
    'The appointment is marked completed'
);

RESET ROLE;
SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000c2');

SELECT is_empty(
    'SELECT * FROM public.visit_notes',
    'A physician cannot read notes for patients they do not treat'
);

RESET ROLE;
SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000b1');

SELECT is_empty(
    'SELECT * FROM public.visit_notes',
    'Front desk cannot read visit notes'
);

RESET ROLE;


-- =========================================
-- 5. Consultation delays
-- =========================================

-- Give Dr Two all-day hours today so the shift does not depend on
-- when the tests run. Rolled back with everything else.
ALTER TABLE public.physician_working_hours
DROP CONSTRAINT physician_working_hours_within_clinic_hours;

DELETE FROM public.physician_working_hours
WHERE physician_id = '00000000-0000-0000-0000-0000000000c2'
  AND day_of_week = EXTRACT(ISODOW FROM now() AT TIME ZONE 'Africa/Lagos');

INSERT INTO public.physician_working_hours (physician_id, day_of_week, start_time, end_time)
VALUES (
    '00000000-0000-0000-0000-0000000000c2',
    EXTRACT(ISODOW FROM now() AT TIME ZONE 'Africa/Lagos')::SMALLINT,
    '00:00',
    '23:59'
);

-- B: Dr Two's consultation, running 10 minutes over.
-- C: Dr Two's next appointment, which should move later.
INSERT INTO public.appointments (
    id, patient_id, physician_id, department_id, original_scheduled_at, scheduled_at,
    status, checked_in_at, actual_started_at
)
VALUES (
    '00000000-0000-0000-0000-0000000000f2',
    '00000000-0000-0000-0000-0000000000e2',
    '00000000-0000-0000-0000-0000000000c2',
    (SELECT id FROM public.departments WHERE name = 'General Medicine'),
    now() - INTERVAL '50 minutes',
    now() - INTERVAL '50 minutes',
    'in_progress',
    now() - INTERVAL '55 minutes',
    now() - INTERVAL '40 minutes'
);

INSERT INTO public.visit_notes (appointment_id, physician_id, symptoms, diagnosis)
VALUES ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c2', 'Headache', 'Tension');

INSERT INTO public.appointments (
    id, patient_id, physician_id, department_id, original_scheduled_at, scheduled_at
)
VALUES (
    '00000000-0000-0000-0000-0000000000f3',
    '00000000-0000-0000-0000-0000000000e3',
    '00000000-0000-0000-0000-0000000000c2',
    (SELECT id FROM public.departments WHERE name = 'General Medicine'),
    now() + INTERVAL '10 minutes',
    now() + INTERVAL '10 minutes'
);

-- B2: Dr Three's consultation, also running over.
-- C2: Dr Three's next appointment, already flagged, so it must not move.
INSERT INTO public.appointments (
    id, patient_id, physician_id, department_id, original_scheduled_at, scheduled_at,
    status, checked_in_at, actual_started_at
)
VALUES (
    '00000000-0000-0000-0000-0000000000f4',
    '00000000-0000-0000-0000-0000000000e4',
    '00000000-0000-0000-0000-0000000000c3',
    (SELECT id FROM public.departments WHERE name = 'Dermatology'),
    now() - INTERVAL '50 minutes',
    now() - INTERVAL '50 minutes',
    'in_progress',
    now() - INTERVAL '55 minutes',
    now() - INTERVAL '40 minutes'
);

INSERT INTO public.visit_notes (appointment_id, physician_id, symptoms, diagnosis)
VALUES ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000c3', 'Rash', 'Eczema');

INSERT INTO public.appointments (
    id, patient_id, physician_id, department_id, original_scheduled_at, scheduled_at,
    reschedule_needs_review, reschedule_review_reason
)
VALUES (
    '00000000-0000-0000-0000-0000000000f5',
    '00000000-0000-0000-0000-0000000000e5',
    '00000000-0000-0000-0000-0000000000c3',
    (SELECT id FROM public.departments WHERE name = 'Dermatology'),
    now() + INTERVAL '10 minutes',
    now() + INTERVAL '10 minutes',
    TRUE,
    'Earlier scheduling conflict'
);

SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000c2');

SELECT lives_ok(
    $$SELECT public.complete_consultation('00000000-0000-0000-0000-0000000000f2')$$,
    'A late consultation can be completed'
);

RESET ROLE;

SELECT CASE
    WHEN (SELECT val FROM tests.ctx WHERE key = 'delay_ok') = 'true' THEN
        ok(
            (SELECT scheduled_at > now() + INTERVAL '10 minutes'
                    AND NOT reschedule_needs_review
             FROM public.appointments
             WHERE id = '00000000-0000-0000-0000-0000000000f3'),
            'The next appointment is moved later by the delay'
        )
    ELSE skip('Too close to midnight in Lagos to test delay shifts', 1)
END;

SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000c3');

SELECT lives_ok(
    $$SELECT public.complete_consultation('00000000-0000-0000-0000-0000000000f4')$$,
    'A late consultation with a flagged next appointment can be completed'
);

RESET ROLE;

SELECT ok(
    (SELECT scheduled_at = now() + INTERVAL '10 minutes'
            AND reschedule_needs_review
     FROM public.appointments
     WHERE id = '00000000-0000-0000-0000-0000000000f5'),
    'An already-flagged appointment is not moved and stays flagged for review'
);


-- =========================================
-- 6. Staff management and reassignment
-- =========================================

SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000a1');

SELECT throws_ok(
    $$SELECT public.set_staff_active('00000000-0000-0000-0000-0000000000a1', FALSE)$$,
    'P0001',
    'You cannot change your own account',
    'An admin cannot deactivate themselves'
);

SELECT throws_like(
    $$SELECT public.set_staff_active('00000000-0000-0000-0000-0000000000c1', FALSE)$$,
    '%active appointment(s)%',
    'A physician with active appointments cannot be deactivated'
);

RESET ROLE;
SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000b1');

-- Dr One has 08:40 (Dr Two is busy then) and 11:20 (Dr Two is free).
INSERT INTO tests.ctx (key, val)
SELECT 'reassign', reassigned_count || '/' || needs_review_count
FROM public.reassign_physician_appointments('00000000-0000-0000-0000-0000000000c1');

SELECT is(
    (SELECT val FROM tests.ctx WHERE key = 'reassign'),
    '1/1',
    'Bulk reassignment moves what it can and flags the rest'
);

SELECT lives_ok(
    $$SELECT public.cancel_appointment(a.id, 'Physician leaving')
      FROM public.appointments AS a
      WHERE a.physician_id = '00000000-0000-0000-0000-0000000000c1'
        AND a.status IN ('scheduled', 'checked_in')$$,
    'Front desk cancels the appointment that could not be reassigned'
);

RESET ROLE;
SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000a1');

SELECT lives_ok(
    $$SELECT public.set_staff_active('00000000-0000-0000-0000-0000000000c1', FALSE)$$,
    'The physician can be deactivated once their appointments are handled'
);

RESET ROLE;
SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000c1');

SELECT is(
    public.current_staff_role(),
    NULL::TEXT,
    'A deactivated physician has no role'
);

SELECT is_empty(
    'SELECT * FROM public.appointments',
    'A deactivated physician sees no appointments'
);

RESET ROLE;
SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000b1');

SELECT throws_ok(
    $$SELECT public.reassign_appointment(
        (SELECT a.id FROM public.appointments AS a
         WHERE a.reference_code = (SELECT val FROM tests.ctx WHERE key = 'r_other')),
        '00000000-0000-0000-0000-0000000000c3')$$,
    'P0001',
    'The new physician must be an active physician in the same department',
    'An appointment cannot be reassigned to another department'
);

SELECT throws_ok(
    $$SELECT public.reassign_appointment(
        (SELECT a.id FROM public.appointments AS a
         WHERE a.reference_code = (SELECT val FROM tests.ctx WHERE key = 'r_other')))$$,
    'P0001',
    'No other physician in this department is free at this time',
    'Automatic reassignment fails clearly when no one is free'
);

RESET ROLE;
SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000a1');

SELECT throws_ok(
    $$SELECT public.change_staff_role('00000000-0000-0000-0000-0000000000c1', 'front_desk')$$,
    'P0001',
    'A physician with appointment history cannot take another role; deactivate this account instead',
    'A physician with history cannot change role'
);

SELECT lives_ok(
    $$SELECT public.set_staff_active('00000000-0000-0000-0000-0000000000a2', FALSE)$$,
    'An admin can deactivate another admin'
);

SELECT lives_ok(
    $$SELECT public.change_staff_role(
        '00000000-0000-0000-0000-0000000000b1',
        'physician',
        (SELECT id FROM public.departments WHERE name = 'Dermatology'))$$,
    'Front desk staff can be made a physician'
);

RESET ROLE;
SELECT tests.authenticate_as('00000000-0000-0000-0000-0000000000a2');

SELECT is(
    public.is_admin(),
    FALSE,
    'A deactivated admin loses admin access'
);

RESET ROLE;

SELECT is(
    (SELECT count(*) FROM public.physician_working_hours
     WHERE physician_id = '00000000-0000-0000-0000-0000000000b1'),
    10::BIGINT,
    'A new physician gets working hours automatically after a role change'
);


SELECT * FROM finish();

ROLLBACK;
