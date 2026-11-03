-- Migration 12: Explicit access for service_role
-- The Edge Functions use service_role (a server-only key, never sent to the
-- browser) to read departments and to create and read staff records.
-- Local Supabase grants service_role full table access by default, but newer
-- hosted projects may not, so the invite failed after sending the email.
-- anon and authenticated keep only the access granted in migration 2.


GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO service_role;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
