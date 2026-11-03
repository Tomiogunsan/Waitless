#!/usr/bin/env bash
# Rebuilds the demo database: every migration on an empty schema, then the
# seed (which also removes all logins). Everything visitors changed is lost.
# Usage: DB_URL="postgresql://..." supabase/scripts/reset-demo.sh
set -euo pipefail

: "${DB_URL:?Set DB_URL to the database connection string}"

cd "$(dirname "$0")/../.."
supabase db reset --db-url "$DB_URL" --yes
