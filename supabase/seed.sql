-- Waitless demo data. Loaded by `supabase db reset` after the migrations.
--
-- Creates:
--   * Staff with real logins (password for all: Waitless@2026)
--   * 14 patients with allergies / history
--   * A busy "today", upcoming bookings, and visit notes
--   * ~90 days of appointment history for the admin analytics
--
-- Dates are relative to the day you run the reset (Lagos time), so the
-- data always looks current.

SELECT setseed(0.42); -- Stable "random" history between resets.


-- =========================================
-- Helpers (temporary: gone when the seed finishes)
-- =========================================

CREATE FUNCTION pg_temp.lagos_today()
RETURNS DATE
LANGUAGE SQL
AS $$
    SELECT (now() AT TIME ZONE 'Africa/Lagos')::DATE;
$$;

-- A clinic date (days from today) and time as a real instant.
CREATE FUNCTION pg_temp.at(p_days INTEGER, p_time TIME)
RETURNS TIMESTAMPTZ
LANGUAGE SQL
AS $$
    SELECT ((pg_temp.lagos_today() + p_days) + p_time) AT TIME ZONE 'Africa/Lagos';
$$;

-- Moves a future or past offset off the weekend, onto the nearest clinic day.
CREATE FUNCTION pg_temp.weekday(p_days INTEGER)
RETURNS INTEGER
LANGUAGE SQL
AS $$
    SELECT p_days + CASE EXTRACT(ISODOW FROM pg_temp.lagos_today() + p_days)::INTEGER
        WHEN 6 THEN CASE WHEN p_days >= 0 THEN 2 ELSE -1 END
        WHEN 7 THEN CASE WHEN p_days >= 0 THEN 1 ELSE -2 END
        ELSE 0
    END;
$$;

-- An auth account. A NULL password means "invited, not yet accepted".
CREATE FUNCTION pg_temp.create_login(p_id UUID, p_email TEXT, p_password TEXT, p_full_name TEXT)
RETURNS VOID
LANGUAGE SQL
AS $$
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, invited_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
        CASE WHEN p_password IS NULL THEN '' ELSE extensions.crypt(p_password, extensions.gen_salt('bf')) END,
        CASE WHEN p_password IS NULL THEN NULL ELSE now() END,
        CASE WHEN p_password IS NULL THEN now() END,
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('full_name', p_full_name),
        now(), now(),
        '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
        gen_random_uuid(), p_id, p_id::TEXT,
        jsonb_build_object('sub', p_id::TEXT, 'email', p_email, 'email_verified', p_password IS NOT NULL),
        'email', now(), now(), now()
    );
$$;

-- One appointment. Fills in the timestamps each status requires.
--   p_note: cancellation reason (cancelled) or review reason (scheduled).
CREATE FUNCTION pg_temp.appointment(
    p_id UUID,
    p_patient UUID,
    p_physician UUID,
    p_days INTEGER,
    p_time TIME,
    p_status TEXT,
    p_checked_in TIME DEFAULT NULL,
    p_started TIME DEFAULT NULL,
    p_ended TIME DEFAULT NULL,
    p_original TIME DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_reference TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE SQL
AS $$
    INSERT INTO public.appointments (
        id, reference_code, patient_id, physician_id, department_id,
        original_scheduled_at, scheduled_at,
        checked_in_at, actual_started_at, actual_ended_at,
        status,
        cancelled_at, cancelled_by_patient, cancellation_reason,
        no_show_at, no_show_by,
        reschedule_needs_review, reschedule_review_reason
    )
    SELECT
        p_id,
        coalesce(p_reference, 'CLN-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 12))),
        p_patient, p_physician, s.department_id,
        pg_temp.at(p_days, coalesce(p_original, p_time)),
        pg_temp.at(p_days, p_time),
        pg_temp.at(p_days, p_checked_in),
        pg_temp.at(p_days, p_started),
        pg_temp.at(p_days, p_ended),
        p_status,
        CASE WHEN p_status = 'cancelled' THEN pg_temp.at(p_days, p_time) - INTERVAL '1 day' END,
        p_status = 'cancelled',
        CASE WHEN p_status = 'cancelled' THEN p_note END,
        CASE WHEN p_status = 'no_show' THEN pg_temp.at(p_days, p_time) + INTERVAL '20 minutes' END,
        CASE WHEN p_status = 'no_show' THEN 'aaaaaaaa-0000-4000-8000-000000000003'::UUID END,
        p_status = 'scheduled' AND p_note IS NOT NULL,
        CASE WHEN p_status = 'scheduled' THEN p_note END
    FROM public.staff AS s
    WHERE s.id = p_physician;
$$;


-- =========================================
-- Staff (password for every active account: Waitless@2026)
-- =========================================

SELECT pg_temp.create_login('aaaaaaaa-0000-4000-8000-000000000001', 'folake@waitless.health', 'Waitless@2026', 'Folake Adeyemi');
SELECT pg_temp.create_login('aaaaaaaa-0000-4000-8000-000000000002', 'emeka@waitless.health', 'Waitless@2026', 'Emeka Obi');
SELECT pg_temp.create_login('aaaaaaaa-0000-4000-8000-000000000003', 'chidinma@waitless.health', 'Waitless@2026', 'Chidinma Okafor');
SELECT pg_temp.create_login('aaaaaaaa-0000-4000-8000-000000000004', 'musa@waitless.health', 'Waitless@2026', 'Musa Ibrahim');
SELECT pg_temp.create_login('aaaaaaaa-0000-4000-8000-000000000005', 'adaeze@waitless.health', 'Waitless@2026', 'Dr. Adaeze Nwosu');
SELECT pg_temp.create_login('aaaaaaaa-0000-4000-8000-000000000006', 'tunde@waitless.health', 'Waitless@2026', 'Dr. Tunde Bakare');
SELECT pg_temp.create_login('aaaaaaaa-0000-4000-8000-000000000007', 'ngozi@waitless.health', 'Waitless@2026', 'Dr. Ngozi Eze');
SELECT pg_temp.create_login('aaaaaaaa-0000-4000-8000-000000000008', 'kemi@waitless.health', 'Waitless@2026', 'Dr. Kemi Alabi');
SELECT pg_temp.create_login('aaaaaaaa-0000-4000-8000-000000000009', 'ibrahim@waitless.health', 'Waitless@2026', 'Dr. Ibrahim Sule');
SELECT pg_temp.create_login('aaaaaaaa-0000-4000-8000-000000000010', 'yemi@waitless.health', NULL, 'Dr. Yemi Ogunleye');
SELECT pg_temp.create_login('aaaaaaaa-0000-4000-8000-000000000011', 'bayo@waitless.health', 'Waitless@2026', 'Bayo Martins');

-- Physicians get clinic working hours automatically (migration 3).
INSERT INTO public.staff (id, full_name, role, department_id)
VALUES
    ('aaaaaaaa-0000-4000-8000-000000000001', 'Folake Adeyemi', 'admin', NULL),
    ('aaaaaaaa-0000-4000-8000-000000000002', 'Emeka Obi', 'admin', NULL),
    ('aaaaaaaa-0000-4000-8000-000000000003', 'Chidinma Okafor', 'front_desk', NULL),
    ('aaaaaaaa-0000-4000-8000-000000000004', 'Musa Ibrahim', 'front_desk', NULL),
    ('aaaaaaaa-0000-4000-8000-000000000005', 'Dr. Adaeze Nwosu', 'physician', (SELECT id FROM public.departments WHERE name = 'General Medicine')),
    ('aaaaaaaa-0000-4000-8000-000000000006', 'Dr. Tunde Bakare', 'physician', (SELECT id FROM public.departments WHERE name = 'General Medicine')),
    ('aaaaaaaa-0000-4000-8000-000000000007', 'Dr. Ngozi Eze', 'physician', (SELECT id FROM public.departments WHERE name = 'Paediatrics')),
    ('aaaaaaaa-0000-4000-8000-000000000008', 'Dr. Kemi Alabi', 'physician', (SELECT id FROM public.departments WHERE name = 'Obstetrics & Gynaecology')),
    ('aaaaaaaa-0000-4000-8000-000000000009', 'Dr. Ibrahim Sule', 'physician', (SELECT id FROM public.departments WHERE name = 'Dermatology')),
    ('aaaaaaaa-0000-4000-8000-000000000010', 'Dr. Yemi Ogunleye', 'physician', (SELECT id FROM public.departments WHERE name = 'Paediatrics')),
    ('aaaaaaaa-0000-4000-8000-000000000011', 'Bayo Martins', 'front_desk', NULL);

-- Bayo has left: no access, and his login is blocked.
UPDATE public.staff
SET is_active = FALSE, deactivated_at = now() - INTERVAL '30 days'
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000011';

UPDATE auth.users
SET banned_until = now() + INTERVAL '100 years'
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000011';


-- =========================================
-- Patients (phones are normalised to +234 by a trigger)
-- =========================================

INSERT INTO public.patients (id, full_name, phone, email)
VALUES
    ('bbbbbbbb-0000-4000-8000-000000000001', 'Amaka Obi', '0803 123 4567', 'amaka.obi@gmail.com'),
    ('bbbbbbbb-0000-4000-8000-000000000002', 'Segun Adebayo', '0802 555 0142', NULL),
    ('bbbbbbbb-0000-4000-8000-000000000003', 'Halima Yusuf', '0706 111 8823', 'halima.y@yahoo.com'),
    ('bbbbbbbb-0000-4000-8000-000000000004', 'Chukwuemeka Nnaji', '0813 987 2210', NULL),
    ('bbbbbbbb-0000-4000-8000-000000000005', 'Funmilayo Ade', '0901 234 7765', 'funmi.ade@outlook.com'),
    ('bbbbbbbb-0000-4000-8000-000000000006', 'Ifeanyi Okeke', '0805 441 0098', NULL),
    ('bbbbbbbb-0000-4000-8000-000000000007', 'Zainab Bello', '0703 556 2214', 'zainab.bello@gmail.com'),
    ('bbbbbbbb-0000-4000-8000-000000000008', 'Tobi Lawal', '0816 774 3320', NULL),
    ('bbbbbbbb-0000-4000-8000-000000000009', 'Ngozi Umeh', '0809 220 1176', 'ngozi.umeh@gmail.com'),
    ('bbbbbbbb-0000-4000-8000-000000000010', 'Kunle Afolabi', '0803 334 7781', NULL),
    ('bbbbbbbb-0000-4000-8000-000000000011', 'Blessing Etim', '0708 993 4412', 'blessing.etim@gmail.com'),
    ('bbbbbbbb-0000-4000-8000-000000000012', 'Musa Danjuma', '0802 667 1193', NULL),
    ('bbbbbbbb-0000-4000-8000-000000000013', 'Ada Eze (child)', '0812 885 0034', 'eze.family@gmail.com'),
    ('bbbbbbbb-0000-4000-8000-000000000014', 'Emeka Nwankwo', '0906 332 8819', NULL);

-- Medical info rows are created by a trigger with allergies 'Unknown'.
UPDATE public.patient_medical_info AS m
SET allergies = v.allergies, medical_history = v.history
FROM (
    VALUES
        ('bbbbbbbb-0000-4000-8000-000000000001'::UUID, 'Penicillin (rash), shellfish', 'Mild asthma since childhood. Uses salbutamol inhaler as needed.'),
        ('bbbbbbbb-0000-4000-8000-000000000002'::UUID, 'None known', 'Hypertension, on amlodipine 5 mg daily.'),
        ('bbbbbbbb-0000-4000-8000-000000000003'::UUID, 'Sulfa drugs', 'Second pregnancy, 24 weeks.'),
        ('bbbbbbbb-0000-4000-8000-000000000005'::UUID, 'None known', 'Type 2 diabetes, diet-controlled.'),
        ('bbbbbbbb-0000-4000-8000-000000000006'::UUID, 'Ibuprofen', NULL),
        ('bbbbbbbb-0000-4000-8000-000000000007'::UUID, 'None known', 'Recurrent eczema flare-ups.'),
        ('bbbbbbbb-0000-4000-8000-000000000009'::UUID, 'Latex', 'Migraine with aura.'),
        ('bbbbbbbb-0000-4000-8000-000000000010'::UUID, 'None known', NULL),
        ('bbbbbbbb-0000-4000-8000-000000000011'::UUID, 'Peanuts (anaphylaxis)', 'Carries an adrenaline auto-injector.'),
        ('bbbbbbbb-0000-4000-8000-000000000013'::UUID, 'None known', 'Age 4. Fully immunised.')
) AS v(patient_id, allergies, history)
WHERE m.patient_id = v.patient_id;


-- =========================================
-- Today: a busy clinic morning
-- =========================================

-- Dr. Adaeze Nwosu (General Medicine): running about 20 minutes late.
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000005', 0, '08:40', 'completed', '08:31', '08:44', '09:21');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000005', 0, '09:20', 'completed', '09:12', '09:24', '10:06');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005', 0, '10:00', 'in_progress', '09:51', '10:21');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-000000000010', 'aaaaaaaa-0000-4000-8000-000000000005', 0, '10:40', 'checked_in', '10:31');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-000000000014', 'aaaaaaaa-0000-4000-8000-000000000005', 0, '11:20', 'checked_in', '10:44');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000006', 'bbbbbbbb-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000005', 0, '13:00', 'scheduled');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000007', 'bbbbbbbb-0000-4000-8000-000000000012', 'aaaaaaaa-0000-4000-8000-000000000005', 0, '13:40', 'scheduled');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000008', 'bbbbbbbb-0000-4000-8000-000000000008', 'aaaaaaaa-0000-4000-8000-000000000005', 0, '15:00', 'scheduled');

-- Dr. Tunde Bakare (General Medicine).
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000009', 'bbbbbbbb-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000006', 0, '08:40', 'completed', '08:35', '08:41', '09:17');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000010', 'bbbbbbbb-0000-4000-8000-000000000009', 'aaaaaaaa-0000-4000-8000-000000000006', 0, '09:20', 'no_show');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000011', 'bbbbbbbb-0000-4000-8000-000000000011', 'aaaaaaaa-0000-4000-8000-000000000006', 0, '10:40', 'in_progress', '10:33', '10:41');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000012', 'bbbbbbbb-0000-4000-8000-000000000007', 'aaaaaaaa-0000-4000-8000-000000000006', 0, '14:20', 'scheduled');

-- Dr. Ngozi Eze (Paediatrics).
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000013', 'bbbbbbbb-0000-4000-8000-000000000013', 'aaaaaaaa-0000-4000-8000-000000000007', 0, '10:40', 'checked_in', '10:25');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000014', 'bbbbbbbb-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000007', 0, '13:00', 'cancelled', p_note => 'Patient travelling');

-- Dr. Kemi Alabi (O&G): pushed back by a delay and flagged for review.
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000015', 'bbbbbbbb-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000008', 0, '11:32', 'scheduled',
    p_original => '11:20',
    p_note => 'Consultation delay requires staff review; later appointments could not all be safely rescheduled.');

-- Dr. Ibrahim Sule (Dermatology).
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000016', 'bbbbbbbb-0000-4000-8000-000000000007', 'aaaaaaaa-0000-4000-8000-000000000009', 0, '10:40', 'checked_in', '10:38');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000017', 'bbbbbbbb-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000009', 0, '16:20', 'scheduled');


-- =========================================
-- Upcoming and past (curated, with visit notes)
-- =========================================

-- The public "Manage booking" demo: CLN-7F3A9C21B4E8 with phone 0803 123 4567.
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000018', 'bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000006', pg_temp.weekday(7), '10:40', 'scheduled', p_reference => 'CLN-7F3A9C21B4E8');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000019', 'bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000005', pg_temp.weekday(14), '09:20', 'scheduled');

SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000020', 'bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000006', pg_temp.weekday(-21), '09:20', 'completed', '09:10', '09:22', '09:58');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000021', 'bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005', pg_temp.weekday(-63), '13:40', 'completed', '13:31', '13:47', '14:19');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000022', 'bbbbbbbb-0000-4000-8000-000000000010', 'aaaaaaaa-0000-4000-8000-000000000006', pg_temp.weekday(-12), '15:00', 'completed', '14:52', '15:04', '15:36');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000023', 'bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000005', pg_temp.weekday(-30), '08:40', 'completed', '08:36', '08:42', '09:15');
SELECT pg_temp.appointment('cccccccc-0000-4000-8000-000000000024', 'bbbbbbbb-0000-4000-8000-000000000014', 'aaaaaaaa-0000-4000-8000-000000000006', pg_temp.weekday(-1), '16:20', 'cancelled', p_note => 'Rebooked for today');

INSERT INTO public.visit_notes (appointment_id, physician_id, symptoms, diagnosis, prescription)
VALUES
    ('cccccccc-0000-4000-8000-000000000020', 'aaaaaaaa-0000-4000-8000-000000000006',
     'Wheezing at night for 5 days, dry cough, mild chest tightness after exercise.',
     'Mild asthma exacerbation, likely triggered by harmattan dust.',
     'Beclometasone 100 mcg inhaler, 2 puffs twice daily for 4 weeks. Continue salbutamol as needed.'),
    ('cccccccc-0000-4000-8000-000000000021', 'aaaaaaaa-0000-4000-8000-000000000005',
     'Sore throat and fever (38.4 °C) for 2 days.',
     'Viral pharyngitis.',
     'Paracetamol 1 g up to 4 times daily. Warm saline gargles. Avoid penicillin-based antibiotics (allergy).'),
    ('cccccccc-0000-4000-8000-000000000022', 'aaaaaaaa-0000-4000-8000-000000000006',
     'Lower back pain after lifting, no numbness or weakness.',
     'Mechanical lower back strain.',
     'Paracetamol, gentle stretching. Review if not improved in 2 weeks.'),
    ('cccccccc-0000-4000-8000-000000000023', 'aaaaaaaa-0000-4000-8000-000000000005',
     'Routine blood pressure review. Occasional morning headaches.',
     'Hypertension, well controlled (128/82).',
     'Continue amlodipine 5 mg daily.'),
    ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005',
     'Follow-up. Headaches resolved, home readings 125/80.',
     'Hypertension, controlled.',
     'Continue amlodipine 5 mg daily. Review in 3 months.'),
    ('cccccccc-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000005',
     'Increased thirst, fasting glucose 7.9 mmol/L on home monitor.',
     'Type 2 diabetes, suboptimal control.',
     'Start metformin 500 mg once daily with evening meal. Dietitian referral.');


-- =========================================
-- 90 days of history for the admin analytics
-- =========================================
-- Finished appointments only (completed, no-show, cancelled), so they never
-- clash with the double-booking constraints. Waits shrink over time to tell
-- the "Waitless is working" story: ~20 min three months ago, ~10 min now.

WITH slots AS MATERIALIZED (
    SELECT
        d.days_ago,
        s.id AS physician_id,
        s.department_id,
        ((pg_temp.lagos_today() - d.days_ago) + t.slot) AT TIME ZONE 'Africa/Lagos' AS slot_at,
        random() AS r_book,
        random() AS r_status,
        random() AS r_wait,
        random() AS r_length,
        random() AS r_patient,
        CASE dep.name
            WHEN 'General Medicine' THEN 0.75
            WHEN 'Paediatrics' THEN 0.6
            WHEN 'Obstetrics & Gynaecology' THEN 0.5
            ELSE 0.4
        END AS demand
    FROM generate_series(2, 90) AS d(days_ago)
    CROSS JOIN public.staff AS s
    JOIN public.departments AS dep ON dep.id = s.department_id
    CROSS JOIN unnest(ARRAY['08:40', '09:20', '10:00', '10:40', '11:20', '13:00', '13:40', '14:20', '15:00', '15:40', '16:20']::TIME[]) AS t(slot)
    WHERE s.role = 'physician'
      AND s.is_active
      AND s.id <> 'aaaaaaaa-0000-4000-8000-000000000010' -- Dr. Yemi hasn't started yet
      AND EXTRACT(ISODOW FROM pg_temp.lagos_today() - d.days_ago) < 6
),
booked AS MATERIALIZED (
    SELECT
        *,
        CASE WHEN r_status < 0.06 THEN 'no_show' WHEN r_status < 0.10 THEN 'cancelled' ELSE 'completed' END AS status,
        slot_at - (4 + r_patient * 10) * INTERVAL '1 minute' AS checked_in_at,
        (4 + days_ago * 0.16 + r_wait * 8) * INTERVAL '1 minute' AS wait,
        (28 + r_length * 10) * INTERVAL '1 minute' AS duration,
        (ARRAY[
            'bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000003',
            'bbbbbbbb-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-000000000006',
            'bbbbbbbb-0000-4000-8000-000000000007', 'bbbbbbbb-0000-4000-8000-000000000008', 'bbbbbbbb-0000-4000-8000-000000000009',
            'bbbbbbbb-0000-4000-8000-000000000010', 'bbbbbbbb-0000-4000-8000-000000000011', 'bbbbbbbb-0000-4000-8000-000000000012',
            'bbbbbbbb-0000-4000-8000-000000000013', 'bbbbbbbb-0000-4000-8000-000000000014'
        ]::UUID[])[1 + floor(r_patient * 14)::INTEGER] AS patient_id
    FROM slots
    WHERE r_book < demand
)
INSERT INTO public.appointments (
    patient_id, physician_id, department_id,
    original_scheduled_at, scheduled_at,
    checked_in_at, actual_started_at, actual_ended_at,
    status,
    cancelled_at, cancelled_by_patient,
    no_show_at, no_show_by,
    created_at
)
SELECT
    patient_id, physician_id, department_id,
    slot_at, slot_at,
    CASE WHEN status = 'completed' THEN checked_in_at END,
    CASE WHEN status = 'completed' THEN checked_in_at + wait END,
    CASE WHEN status = 'completed' THEN checked_in_at + wait + duration END,
    status,
    CASE WHEN status = 'cancelled' THEN slot_at - INTERVAL '1 day' END,
    status = 'cancelled',
    CASE WHEN status = 'no_show' THEN slot_at + INTERVAL '20 minutes' END,
    CASE WHEN status = 'no_show' THEN 'aaaaaaaa-0000-4000-8000-000000000003'::UUID END,
    slot_at - INTERVAL '5 days'
FROM booked;
