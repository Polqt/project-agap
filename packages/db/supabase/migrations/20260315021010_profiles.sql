-- ============================================================
-- Migration 0002: Profiles + Auth Trigger
-- 
-- Auth strategy:
--   - Barangay officials (admins) → created by developers via
--     Supabase dashboard or service-role API. role = 'official'.
--   - Residents → self-register from the mobile app via
--     supabase.auth.signUp(). role = 'resident'.
--
-- A profile row is auto-created for every auth.users insert
-- via the handle_new_user() trigger.
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('resident', 'official');

CREATE TABLE public.profiles (
    id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role            public.app_role NOT NULL DEFAULT 'resident',
    full_name       TEXT NOT NULL DEFAULT '',
    phone_number    TEXT UNIQUE,
    barangay_id     UUID,
    purok           TEXT,
    is_sms_only     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_role      ON public.profiles(role);
CREATE INDEX idx_profiles_barangay  ON public.profiles(barangay_id);
CREATE INDEX idx_profiles_phone     ON public.profiles(phone_number);

-- ── Trigger: auto-create profile on signup ──────────────────
-- SECURITY DEFINER lets the trigger write to profiles before
-- the new user has any RLS permissions of their own.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    phone_number,
    avatar_url
  )
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::public.app_role,
      'resident'
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    ),
    COALESCE(NEW.raw_user_meta_data ->> 'phone_number', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', '')
  );
  RETURN NEW;
END;
$$;


CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users  
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- ── Trigger: keep updated_at fresh ──────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();