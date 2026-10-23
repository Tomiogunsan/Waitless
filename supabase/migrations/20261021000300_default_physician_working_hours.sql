
-- Migration 3: Clinic opening hours and default physician schedules
-- The clinic is open Monday to Friday, 08:40 to 17:00 (Africa/Lagos),
-- with a lunch break from 12:00 to 13:00.
-- Each appointment reserves 40 minutes:
-- 35 minutes with the patient and 5 minutes of rest.
--
-- Bookable slot start times per physician per day:
--   Morning:   08:40, 09:20, 10:00, 10:40, 11:20
--   Afternoon: 13:00, 13:40, 14:20, 15:00, 15:40, 16:20


-- Working hours must stay inside clinic opening hours
-- and must never cover the lunch break.

ALTER TABLE public.physician_working_hours
ADD CONSTRAINT physician_working_hours_within_clinic_hours CHECK (
    day_of_week BETWEEN 1 AND 5
    AND start_time >= TIME '08:40'
    AND end_time <= TIME '17:00'
    AND (
        end_time <= TIME '12:00'
        OR start_time >= TIME '13:00'
    )
);


-- Give a physician the standard clinic schedule.
-- ON CONFLICT DO NOTHING skips blocks that would overlap
-- hours the physician already has.

CREATE OR REPLACE FUNCTION public.create_default_physician_working_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.role = 'physician'
       AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM 'physician') THEN
        INSERT INTO public.physician_working_hours (
            physician_id,
            day_of_week,
            start_time,
            end_time
        )
        SELECT
            NEW.id,
            d.day_of_week,
            b.start_time,
            b.end_time
        FROM generate_series(1, 5) AS d(day_of_week)
        CROSS JOIN (
            VALUES
                (TIME '08:40', TIME '12:00'),
                (TIME '13:00', TIME '17:00')
        ) AS b(start_time, end_time)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.create_default_physician_working_hours() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.create_default_physician_working_hours()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER create_default_physician_working_hours_after_write
AFTER INSERT OR UPDATE OF role ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.create_default_physician_working_hours();


-- Backfill any physicians created before this migration.

INSERT INTO public.physician_working_hours (
    physician_id,
    day_of_week,
    start_time,
    end_time
)
SELECT
    s.id,
    d.day_of_week,
    b.start_time,
    b.end_time
FROM public.staff AS s
CROSS JOIN generate_series(1, 5) AS d(day_of_week)
CROSS JOIN (
    VALUES
        (TIME '08:40', TIME '12:00'),
        (TIME '13:00', TIME '17:00')
) AS b(start_time, end_time)
WHERE s.role = 'physician'
ON CONFLICT DO NOTHING;
