ALTER TABLE public.barangays
  ADD COLUMN resident_ping_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN resident_checkin_enabled BOOLEAN NOT NULL DEFAULT false;
