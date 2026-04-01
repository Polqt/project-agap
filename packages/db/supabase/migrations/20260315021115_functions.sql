-- ============================================================
-- Migration 0008: RPC Functions
-- All callable from the mobile app via supabase.rpc()
-- ============================================================
 
-- ── get_dashboard_summary ─────────────────────────────────────
-- Returns live stat counts for the official dashboard.
-- Called by DashboardScreen on mount and via Realtime refresh.\

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_barangay_id UUID)
RETURNS TABLE (
    total_households        BIGINT,
    checked_in_count        BIGINT,
    safe_count              BIGINT,
    need_help_count         BIGINT,
    unaccounted_count       BIGINT,
    vulnerable_unaccounted  BIGINT,
    sms_replied_count       BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        COUNT(*)                                                               AS total_households,
        COUNT(*) FILTER (WHERE evacuation_status = 'checked_in')               AS checked_in_count,
        COUNT(*) FILTER (WHERE evacuation_status = 'safe')                     AS safe_count,
        COUNT(*) FILTER (WHERE evacuation_status = 'need_help')                AS need_help_count,
        COUNT(*) FILTER (WHERE evacuation_status IN ('home','unknown','evacuating')) AS unaccounted_count,
        COUNT(*) FILTER (
            WHERE evacuation_status IN ('home','unknown','evacuating')
              AND cardinality(vulnerability_flags) > 0
        )                                                                       AS vulnerable_unaccounted,
        COUNT(*) FILTER (
            WHERE evacuation_status IN ('safe','checked_in')
              AND is_sms_only = true
        )                                                                       AS sms_replied_count
    FROM public.households
    WHERE barangay_id = p_barangay_id;
$$;

-- Get unaccounted households
-- Returns unaccounted households sorted: vulnerable first
-- Then by purok. Used by the priority rescue queue on the dashboard.

CREATE OR REPLACE FUNCTION public.get_unaccounted_households(p_barangay_id UUID)
RETURNS SETOF public.households
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT *
    FROM public.households
    WHERE barangay_id = p_barangay_id
        AND evacuation_status IN ('home', 'unknown', 'evacuating')
    ORDER BY
        cardinality(vulnerability_flags) DESC,  -- vulnerable first
        purok ASC,
        household_head ASC;
$$;

-- Search households
-- Full-text + trigram search on the household registry.
-- Supports Filipino names with diacritics via unaccent.

CREATE OR REPLACE FUNCTION public.search_households(
    p_barangay_id UUID,
    p_query TEXT
)
RETURNS SETOF public.households
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'extensions'
AS $$
    SELECT *
    FROM public.households
    WHERE barangay_id = p_barangay_id
        AND (
            fts @@ plainto_tsquery('simple', unaccent(p_query))
            OR household_head ILIKE '%' || p_query || '%'
            OR purok ILIKE '%' || p_query || '%'
        )
    ORDER BY
        ts_rank(fts, plainto_tsquery('simple', unaccent(p_query))) DESC
    LIMIT 50;
$$;

-- Get nearby evacuation centers
-- Returns open evacuation centers near the resident's location.
-- Used by EvacuationMapScreen to sort center pins by proximity.

CREATE OR REPLACE FUNCTION public.get_nearby_centers(
    p_lat  DOUBLE PRECISION,
    p_lng  DOUBLE PRECISION,
    p_barangay_id UUID,
    p_radius_km DOUBLE PRECISION DEFAULT 10.0
)
RETURNS TABLE (
    id              UUID,
    name            TEXT,
    address         TEXT,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    capacity        INTEGER,
    current_occupancy INTEGER,
    is_open         BOOLEAN,
    contact_number  TEXT,
    notes           TEXT,
    qr_code_token   TEXT,
    distance_km     DOUBLE PRECISION
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        c.id, c.name, c.address,
        c.latitude, c.longitude,
        c.capacity, c.current_occupancy,
        c.is_open, c.contact_number, c.notes,
        c.qr_code_token,
        extensions.ST_Distance(
            c.geom,
            extensions.ST_SetSRID(
                extensions.ST_MakePoint(p_lng, p_lat), 4326
            )::extensions.geography
        ) / 1000.0 AS distance_km
    FROM public.evacuation_centers c
    WHERE c.barangay_id = p_barangay_id
        AND c.is_open = true
        AND extensions.ST_DWithin(
            c.geom,
            extensions.ST_SetSRID(
                extensions.ST_MakePoint(p_lng, p_lat), 4326
            )::extensions.geography,
            p_radius_km * 1000
        )
    ORDER BY distance_km ASC;
$$;

-- Check-in by qr
-- Called when resident scans a QR code at a center.
-- Validates token, creates check_in row, returns center info.

CREATE OR REPLACE FUNCTION public.checkin_by_qr(
    p_qr_token    TEXT,
    p_resident_id UUID,
    p_household_id UUID DEFAULT NULL,
    p_lat         DOUBLE PRECISION DEFAULT NULL,
    p_lng         DOUBLE PRECISION DEFAULT NULL
)
RETURNS TABLE (
    success       BOOLEAN,
    message       TEXT,
    center_name   TEXT,
    center_id     UUID
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_center public.evacuation_centers;
BEGIN
    -- Find and validate the center
    SELECT * INTO v_center
    FROM public.evacuation_centers
    WHERE qr_code_token = p_qr_token AND is_open = true;
 
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Invalid or inactive QR code.', NULL::TEXT, NULL::UUID;
        RETURN;
    END IF;
 
    -- Insert check-in
    INSERT INTO public.check_ins (
        barangay_id, center_id, resident_id,
        household_id, method, latitude, longitude
    )
    VALUES (
        v_center.barangay_id, v_center.id, p_resident_id,
        p_household_id, 'qr', p_lat, p_lng
    );
 
    RETURN QUERY SELECT true, 'Checked in successfully.', v_center.name, v_center.id;
END;
$$;

-- Resolve need help ping
-- Official marks a need-help ping as handled.
 
CREATE OR REPLACE FUNCTION public.resolve_need_help_ping(p_ping_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.status_pings
    SET
        is_resolved = true,
        resolved_by = auth.uid(),
        resolved_at = now()
    WHERE id = p_ping_id
        AND public.is_official_of(barangay_id);
END;
$$;

-- Get sms-followup-list
-- Returns households that received an SMS but haven't replied
-- after p_minutes_threshold minutes. For the captain's follow-up list.
 
CREATE OR REPLACE FUNCTION public.get_sms_followup_list(
    p_barangay_id     UUID,
    p_broadcast_id    UUID,
    p_minutes_threshold INTEGER DEFAULT 30
)
RETURNS TABLE (
    household_id      UUID,
    household_head    TEXT,
    purok             TEXT,
    phone_number      TEXT,
    vulnerability_flags public.vulnerability_flag[],
    sms_sent_at       TIMESTAMPTZ,
    minutes_since_sent DOUBLE PRECISION
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        h.id AS household_id,
        h.household_head,
        h.purok,
        h.phone_number,
        h.vulnerability_flags,
        sl.sent_at,
        EXTRACT(EPOCH FROM (now() - sl.sent_at)) / 60.0 AS minutes_since_sent
    FROM public.sms_logs sl
    JOIN public.households h ON h.phone_number = sl.phone_number
    WHERE sl.barangay_id = p_barangay_id
        AND sl.broadcast_id = p_broadcast_id
        AND sl.direction = 'outbound'
        AND sl.delivery_status = 'delivered'
        AND sl.replied_at IS NULL
        AND sl.sent_at < now() - (p_minutes_threshold || ' minutes')::INTERVAL
    ORDER BY
        cardinality(h.vulnerability_flags) DESC,
        sl.sent_at ASC;
$$;

-- Upsert push token
-- Called from mobile app on each launch to register/refresh token.

CREATE OR REPLACE FUNCTION public.upsert_push_token(
  p_token      TEXT,
  p_platform   TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.push_tokens (resident_id, barangay_id, token, platform)
    VALUES (
        auth.uid(),
        public.get_my_barangay(),
        p_token,
        p_platform
    )
    ON CONFLICT (token) DO UPDATE
        SET is_active = true, updated_at = now(), platform = p_platform;
END;
$$;
