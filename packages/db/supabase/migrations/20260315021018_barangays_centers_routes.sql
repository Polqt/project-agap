-- ============================================================
-- Migration 0003: Barangays + Evacuation Centers + Routes
--
-- Barangays are seeded by developers (one row per barangay
-- that onboards to Agap). Officials are assigned to a barangay.
-- Residents self-assign during profile setup.
-- ============================================================

CREATE TABLE public.barangays (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL,                      
    municipality    TEXT        NOT NULL,                     
    province        TEXT        NOT NULL,                      
    region          TEXT        NOT NULL DEFAULT 'Region VI',
    latitude        DOUBLE PRECISION NOT NULL,                 
    longitude       DOUBLE PRECISION NOT NULL,
    geom            extensions.geography(Point, 4326)
    GENERATED ALWAYS AS (
        extensions.ST_SetSRID(
            extensions.ST_MakePoint(longitude, latitude), 
            4326
        )::extensions.geography
    ) STORED,
    alert_level         TEXT NOT NULL DEFAULT 'normal'
        CHECK ( 
            alert_level IN ('normal', 'advisory', 'watch', 'warning', 'danger')
        ),
    active_alert_text   TEXT,
    total_households    BIGINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ          DEFAULT now()
);

CREATE INDEX idx_barangays_geom ON public.barangays USING GIST(geom);
CREATE INDEX idx_barangays_municipality ON public.barangays(municipality);

CREATE TRIGGER barangays_updated_at
    BEFORE UPDATE ON public.barangays
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Back-fill FK on profiles

ALTER TABLE public.profiles
    ADD CONSTRAINT fk_profiles_barangay
    FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE SET NULL;


-- Evacuation Centers

CREATE TABLE public.evacuation_centers (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    barangay_id     UUID        NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,                      -- "USLS Evacuation Center"
    address         TEXT        NOT NULL DEFAULT '',
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    geom            extensions.geography(Point, 4326)
        GENERATED ALWAYS AS (
                extensions.ST_SetSRID(
                extensions.ST_MakePoint(longitude, latitude), 4326
            )::extensions.geography
        ) STORED,
    capacity        INTEGER     NOT NULL DEFAULT 0,
    is_open         BOOLEAN     NOT NULL DEFAULT false,
    contact_number  TEXT,
    notes           TEXT,
    qr_code_token   TEXT        UNIQUE DEFAULT gen_random_uuid()::TEXT, -- used for QR check-in
    current_occupancy INTEGER   NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ          DEFAULT now()
);

CREATE INDEX idx_centers_barangay ON public.evacuation_centers(barangay_id);
CREATE INDEX idx_centers_geom     ON public.evacuation_centers USING GIST(geom);
CREATE INDEX idx_centers_open     ON public.evacuation_centers(is_open) WHERE is_open = true;

CREATE TRIGGER centers_updated_at
    BEFORE UPDATE ON public.evacuation_centers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    
-- Evacuation Routes 
-- GeoJSON LineString stored as PostGIS geometry.
-- Each route connects a purok or area to an evacuation center.

CREATE TABLE public.evacuation_routes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    barangay_id     UUID        NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
    center_id       UUID        NOT NULL REFERENCES public.evacuation_centers(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,                      -- e.g. "Purok Daga → USLS Evac Center"
    purok_origin    TEXT,                                      -- which purok this route serves
    route_geojson   JSONB       NOT NULL,                      -- GeoJSON LineString for the mobile map
    distance_meters INTEGER,
    estimated_walk_minutes INTEGER,
    color_hex       TEXT        NOT NULL DEFAULT '#1A56C4',    -- route line color on map
    is_accessible   BOOLEAN     NOT NULL DEFAULT true,         -- PWD-friendly path
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ          DEFAULT now()
);

CREATE INDEX idx_routes_barangay ON public.evacuation_routes(barangay_id);
CREATE INDEX idx_routes_center   ON public.evacuation_routes(center_id);
 
CREATE TRIGGER routes_updated_at
  BEFORE UPDATE ON public.evacuation_routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();