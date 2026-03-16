-- ============================================================
-- Migration 0005: Check-Ins + Status Pings + Push Tokens
--
-- check_ins     → resident arrived at an evacuation center
-- status_pings  → resident sent safe or need-help signal
-- push_tokens   → Expo push tokens for push notifications
--
-- Both check_ins and status_pings are written by:
--   (a) the resident directly from the app
--   (b) an inbound SMS reply via Edge Function (resident_id = NULL,
--       household_id matched by phone number)
-- ============================================================

CREATE TABLE public.check_ins (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    barangay_id     UUID        NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
    center_id       UUID        NOT NULL REFERENCES public.evacuation_centers(id) ON DELETE CASCADE,
    resident_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,  -- NULL if via SMS
    household_id    UUID        REFERENCES public.households(id) ON DELETE SET NULL,
    method          TEXT        NOT NULL DEFAULT 'qr'
        CHECK (method IN ('qr', 'manual', 'proxy', 'sms')), -- 'proxy' = family member checked in on behalf of others, 'sms' = checked in via SMS reply keyword
    checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    notes           TEXT
);

CREATE INDEX idx_checkins_barangay   ON public.check_ins(barangay_id);
CREATE INDEX idx_checkins_center     ON public.check_ins(center_id);
CREATE INDEX idx_checkins_resident   ON public.check_ins(resident_id);
CREATE INDEX idx_checkins_household  ON public.check_ins(household_id);
CREATE INDEX idx_checkins_time       ON public.check_ins(checked_in_at DESC);

-- Trigger: update center occupancy on check-in

CREATE OR REPLACE FUNCTION public.update_center_occupancy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.evacuation_centers
    SET current_occupancy = current_occupancy + 1
    WHERE id = NEW.center_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_check_in
    AFTER INSERT ON public.check_ins
    FOR EACH ROW
    EXECUTE FUNCTION public.update_center_occupancy();

-- Trigger: update household evacuation status on check-in

CREATE OR REPLACE FUNCTION public.update_household_status_on_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.household_id IS NOT NULL THEN
        UPDATE public.households
        SET evacuation_status = 'checked_in'
        WHERE id = NEW.household_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_check_in_update_household
    AFTER INSERT ON public.check_ins
    FOR EACH ROW
    EXECUTE FUNCTION public.update_household_status_on_checkin();

-- Status Pings

CREATE TYPE public.ping_status AS ENUM ('safe', 'need_help');

CREATE TABLE public.status_pings (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    barangay_id     UUID        NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
    resident_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    household_id    UUID        REFERENCES public.households(id) ON DELETE SET NULL,
    status          public.ping_status NOT NULL,
    channel         TEXT        NOT NULL DEFAULT 'app'
        CHECK (channel IN ('app', 'sms')),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    message         TEXT,                                       -- optional note from resident
    is_resolved     BOOLEAN     NOT NULL DEFAULT false,         -- captain marked as handled
    resolved_by     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at     TIMESTAMPTZ,
    pinged_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pings_barangay     ON public.status_pings(barangay_id);
CREATE INDEX idx_pings_resident     ON public.status_pings(resident_id);
CREATE INDEX idx_pings_household    ON public.status_pings(household_id);
CREATE INDEX idx_pings_status       ON public.status_pings(status);
CREATE INDEX idx_pings_unresolved   ON public.status_pings(is_resolved) WHERE is_resolved = false;
CREATE INDEX idx_pings_time         ON public.status_pings(pinged_at DESC);

-- Trigger: update household status on ping

CREATE OR REPLACE FUNCTION public.update_household_status_on_ping()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.household_id IS NOT NULL THEN
        UPDATE public.households
        SET evacuation_status = CASE NEW.status
        WHEN 'safe' THEN 'safe'
        WHEN 'need_help' THEN 'need_help'
        END
        WHERE id = NEW.household_id
          AND evacuation_status NOT IN ('safe', 'need_help');  -- don't overwrite once marked
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_ping_update_household
  AFTER INSERT ON public.status_pings
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_household_status_on_ping();

-- Push Tokens
-- Expo push token per device. One user may have multiple devices.

CREATE TABLE public.push_tokens (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    barangay_id     UUID        NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
    token           TEXT        NOT NULL UNIQUE,               -- Expo push token
    platform        TEXT        CHECK (platform IN ('ios', 'android')),
    is_active       BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ          DEFAULT now()
);

CREATE INDEX idx_push_tokens_resident  ON public.push_tokens(resident_id);
CREATE INDEX idx_push_tokens_barangay  ON public.push_tokens(barangay_id);
CREATE INDEX idx_push_tokens_active    ON public.push_tokens(is_active) WHERE is_active = true;
 
CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW 
  EXECUTE FUNCTION public.set_updated_at();