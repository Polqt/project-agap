-- ============================================================
-- Migration 009: Supabase Realtime Configuration
--
-- Enable Realtime publications for tables that need live updates
-- on the official dashboard and resident screens.
-- ============================================================

-- Add tables to the Supabase Realtime publication.
-- The mobile app subscribes via:
--   supabase.channel('...').on('postgres_changes', ...).subscribe()
 
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_pings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.households;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.needs_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evacuation_centers;
