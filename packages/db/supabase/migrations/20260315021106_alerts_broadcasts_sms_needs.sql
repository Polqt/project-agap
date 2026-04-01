-- ============================================================
-- Migration 0006: Alerts + Broadcasts + SMS Logs + Needs Reports
-- ============================================================

-- Alerts (PAGASA / PHIVOLCS)
-- Populated by the edge-fn-alerts-poller cron.
-- Scoped to barangay via geospatial intersection of the
-- barangay centroid with the alert's affected area.

CREATE TYPE public.alert_source AS ENUM ('pagasa', 'phivolcs', 'ldrrmo', 'manual');
CREATE TYPE public.alert_severity AS ENUM ('info', 'advisory', 'watch', 'warning', 'danger');

CREATE TABLE public.alerts (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    barangay_id     UUID        REFERENCES public.barangays(id) ON DELETE CASCADE, -- NULL barangay_id = national-level alert broadcast to all barangays
    source          public.alert_source NOT NULL,
    severity        public.alert_severity NOT NULL DEFAULT 'info',
    hazard_type     TEXT        NOT NULL, -- e.g. "typhoon", "earthquake", "volcanic_activity", "flood", "landslide"
    title           TEXT        NOT NULL,
    title_filipino  TEXT,
    body            TEXT        NOT NULL,
    body_filipino   TEXT,
    signal_level    TEXT, -- "Signal No. 2", "Alert Level 3"
    recommended_actions TEXT,
    recommended_actions_filipino TEXT,
    source_url      TEXT,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ,
    is_active       BOOLEAN     NOT NULL DEFAULT true,
    external_id     TEXT        UNIQUE, -- dedup key from source agency
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
 
CREATE INDEX idx_alerts_barangay    ON public.alerts(barangay_id);
CREATE INDEX idx_alerts_active      ON public.alerts(is_active) WHERE is_active = true;
CREATE INDEX idx_alerts_severity    ON public.alerts(severity);
CREATE INDEX idx_alerts_issued      ON public.alerts(issued_at DESC);
CREATE INDEX idx_alerts_source      ON public.alerts(source);

-- Broadcasts
-- Created by officials via the Broadcast screen.
-- Insertion triggers the edge-fn-broadcast fan-out (push + SMS).

CREATE TYPE public.broadcast_type AS ENUM (
    'evacuate_now',
    'stay_alert',
    'all_clear',
    'custom'
);

CREATE TABLE public.broadcasts (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    barangay_id     UUID        NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
    sent_by         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    broadcast_type  public.broadcast_type NOT NULL DEFAULT 'custom',
    message         TEXT        NOT NULL,
    message_filipino TEXT,
    target_purok    TEXT, -- NULL = entire barangay
    push_sent_count INTEGER     NOT NULL DEFAULT 0,
    sms_sent_count  INTEGER     NOT NULL DEFAULT 0,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
 
CREATE INDEX idx_broadcasts_barangay ON public.broadcasts(barangay_id);
CREATE INDEX idx_broadcasts_sent_at  ON public.broadcasts(sent_at DESC);

-- SMS Logs
-- Tracks every outbound SMS and inbound keyword reply.
-- Written by edge functions, not the mobile app.

CREATE TYPE public.sms_direction AS ENUM ('outbound', 'inbound');
CREATE TYPE public.sms_delivery_status AS ENUM ('queued', 'sent', 'delivered', 'failed', 'replied');
CREATE TYPE public.sms_keyword AS ENUM ('LIGTAS', 'TULONG', 'NASAAN', 'SINO', 'unknown');

CREATE TABLE public.sms_logs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    barangay_id     UUID        NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
    household_id    UUID        REFERENCES public.households(id) ON DELETE SET NULL,
    broadcast_id    UUID        REFERENCES public.broadcasts(id) ON DELETE SET NULL,
    direction       public.sms_direction NOT NULL,
    phone_number    TEXT        NOT NULL,
    message         TEXT        NOT NULL,
    delivery_status public.sms_delivery_status NOT NULL DEFAULT 'queued',
    keyword_reply   public.sms_keyword, -- parsed from inbound SMS
    gateway_message_id TEXT, -- Semaphore message ID
    error_message   TEXT,
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    replied_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX idx_sms_barangay        ON public.sms_logs(barangay_id);
CREATE INDEX idx_sms_phone           ON public.sms_logs(phone_number);
CREATE INDEX idx_sms_broadcast       ON public.sms_logs(broadcast_id);
CREATE INDEX idx_sms_direction       ON public.sms_logs(direction);
CREATE INDEX idx_sms_status          ON public.sms_logs(delivery_status);
CREATE INDEX idx_sms_undelivered     ON public.sms_logs(delivery_status)
  WHERE delivery_status IN ('sent', 'queued'); -- follow-up list query

-- Needs Reports
-- Submitted by official after residents are sheltering.
-- Escalated to Municipal DRRMO.

CREATE TABLE public.needs_reports (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    barangay_id         UUID    NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
    center_id           UUID    REFERENCES public.evacuation_centers(id) ON DELETE SET NULL,
    submitted_by        UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_evacuees      INTEGER NOT NULL DEFAULT 0,
    needs_food_packs    INTEGER NOT NULL DEFAULT 0,
    needs_water_liters  INTEGER NOT NULL DEFAULT 0,
    needs_medicine      BOOLEAN NOT NULL DEFAULT false,
    needs_blankets      INTEGER NOT NULL DEFAULT 0,
    medical_cases       TEXT,
    notes               TEXT,
    status              TEXT    NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'acknowledged', 'resolved')),
    acknowledged_by     UUID    REFERENCES public.profiles(id) ON DELETE SET NULL,
    acknowledged_at     TIMESTAMPTZ,
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ          DEFAULT now()
);

CREATE INDEX idx_needs_barangay  ON public.needs_reports(barangay_id);
CREATE INDEX idx_needs_status    ON public.needs_reports(status);
CREATE INDEX idx_needs_submitted ON public.needs_reports(submitted_at DESC);
 
CREATE TRIGGER needs_reports_updated_at
  BEFORE UPDATE ON public.needs_reports
  FOR EACH ROW 
  EXECUTE FUNCTION public.set_updated_at();
  