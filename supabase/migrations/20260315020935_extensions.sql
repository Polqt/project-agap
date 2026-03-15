-- ============================================================
-- Migration 0001: Extensions
-- Enable all required Postgres extensions before any tables.
-- PostGIS handles geospatial queries (evacuation center proximity).
-- pgcrypto provides gen_random_uuid() as fallback.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp"  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"   WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "postgis"    WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm"    WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "unaccent"   WITH SCHEMA extensions;