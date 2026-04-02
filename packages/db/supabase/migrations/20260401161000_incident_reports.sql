-- ============================================================
-- Migration: Official AI Incident Reports
-- ============================================================

CREATE TABLE public.incident_reports (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    barangay_id         UUID        NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
    generated_by        UUID        NOT NULL REFERENCES public.profiles(id),
    title_english       TEXT        NOT NULL,
    title_filipino      TEXT        NOT NULL,
    body_english        TEXT        NOT NULL,
    body_filipino       TEXT        NOT NULL,
    next_steps_english  TEXT        NOT NULL,
    next_steps_filipino TEXT        NOT NULL,
    dashboard_snapshot  JSONB       NOT NULL DEFAULT '{}'::jsonb,
    generation_source   TEXT        NOT NULL DEFAULT 'template_free',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_reports_barangay ON public.incident_reports(barangay_id);
CREATE INDEX idx_incident_reports_created_at ON public.incident_reports(created_at DESC);

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Officials can manage incident reports in their barangay"
    ON public.incident_reports
    FOR ALL
    USING (
        public.is_official_of(barangay_id)
    );
