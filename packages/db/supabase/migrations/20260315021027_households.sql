-- ============================================================
-- Migration 0004: Households + Household Members
--
-- Households are registered by residents during profile setup,
-- or by BHWs on behalf of SMS-only households.
-- Members inherit the household's barangay and purok.
-- ============================================================

CREATE TYPE public.vulnerability_flag AS ENUM (
    'elderly',
    'pwd',
    'infant',
    'pregnant',
    'solo_parent',
    'chronic_illness',
);

CREATE TABLE public.households (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    barangay_id       UUID        NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
    registered_by     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    household_head    TEXT        NOT NULL,                    -- full name of head
    purok             TEXT        NOT NULL,
    address           TEXT        NOT NULL DEFAULT '',
    phone_number      TEXT,                                    -- primary contact, used for SMS fallback
    total_members     INTEGER     NOT NULL DEFAULT 1,
    vulnerability_flags public.vulnerability_flag[] NOT NULL DEFAULT '{}',
    is_sms_only       BOOLEAN     NOT NULL DEFAULT false,      -- no smartphone in household
    evacuation_status TEXT        NOT NULL DEFAULT 'home'
        CHECK (evacuation_status IN ('home','evacuating','checked_in','safe','need_help','unknown')),
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ          DEFAULT now()
);

CREATE INDEX idx_households_barangay      ON public.households(barangay_id);
CREATE INDEX idx_households_purok         ON public.households(purok);
CREATE INDEX idx_households_phone         ON public.households(phone_number);
CREATE INDEX idx_households_status        ON public.households(evacuation_status);
CREATE INDEX idx_households_vuln_flags    ON public.households USING GIN(vulnerability_flags);
CREATE INDEX idx_households_sms_only      ON public.households(is_sms_only) WHERE is_sms_only = true;

-- Full-text search on household head name + purok + address

ALTER TABLE public.households
    ADD COLUMN fts tsvector
    GENERATED ALWAYS AS (
        to_tsvector('simple',
            unaccent(COALESCE(household_head, '')) || ' ' ||
            unaccent(COALESCE(purok, '')) || ' ' ||
            unaccent(COALESCE(address, ''))
        )
    ) STORED;

CREATE INDEX idx_households_fts ON public.households USING GIN(fts);

CREATE TRIGGER households_updated_at
    BEFORE UPDATE ON public.households
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Trigger: sync barangay total_households count 

CREATE OR REPLACE FUNCTION public.sync_household_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.barangays
        SET total_households = total_households + 1
        WHERE id = NEW.barangay_id
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.barangays
        SET total_households = GREATEST(total_households - 1, 0)
        WHERE id = OLD.barangay_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER on_household_change
  AFTER INSERT OR DELETE ON public.households
  FOR EACH ROW 
  EXECUTE FUNCTION public.sync_household_count();

-- Household Members

CREATE TABLE public.household_members (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id    UUID        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    full_name       TEXT        NOT NULL,
    age             INTEGER,
    vulnerability_flags public.vulnerability_flag[] NOT NULL DEFAULT '{}',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_members_household   ON public.household_members(household_id); 
CREATE INDEX idx_members_vuln_flags  ON public.household_members USING GIN(vulnerability_flags); 