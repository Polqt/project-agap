-- ============================================================
-- Migration: Missing Persons — report and search for missing residents
-- ============================================================

CREATE TYPE public.missing_person_status AS ENUM ('missing', 'found');

CREATE TABLE public.missing_persons (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    barangay_id         UUID        NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
    reported_by         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name           TEXT        NOT NULL,
    age                 INTEGER,
    last_seen_location  TEXT,
    description         TEXT,
    status              public.missing_person_status NOT NULL DEFAULT 'missing',
    found_at            TIMESTAMPTZ,
    found_by            UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ          DEFAULT now()
);

CREATE INDEX idx_missing_persons_barangay ON public.missing_persons(barangay_id);
CREATE INDEX idx_missing_persons_status   ON public.missing_persons(status);
CREATE INDEX idx_missing_persons_created  ON public.missing_persons(created_at DESC);

CREATE TRIGGER missing_persons_updated_at
  BEFORE UPDATE ON public.missing_persons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS: any authenticated user can report/view within their barangay
ALTER TABLE public.missing_persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_access_missing_persons" ON public.missing_persons
    FOR ALL
    USING (
        barangay_id = (
            SELECT barangay_id FROM public.profiles WHERE id = auth.uid()
        )
    );
