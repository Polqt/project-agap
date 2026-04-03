-- History alignment migration.
--
-- The linked Supabase project already had version 20260402090000 recorded in
-- its migration history before this repository tracked the SQL body.
-- Keep this file as a deliberate no-op so local history can replay in the
-- same order without generating a fake schema change.
SELECT 1;
