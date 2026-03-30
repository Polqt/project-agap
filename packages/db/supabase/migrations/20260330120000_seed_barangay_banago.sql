-- ============================================================
-- Seed pilot barangay: Barangay Banago, Bacolod City (Western Visayas).
--
-- Centroid (approx. barangay midpoint for map / PostGIS point):
--   10.7036°N, 122.9501°E — source: PhilAtlas barangay profile.
-- https://www.philatlas.com/visayas/r06/bacolod/banago.html
--
-- Fixed UUIDs keep API ordering, tests, and local map caching predictable.
-- ============================================================

-- Allow pre-signup residents to load the barangay picker (RLS was authenticated-only).
CREATE POLICY "Anonymous can read barangays for registration"
    ON public.barangays
    FOR SELECT
    TO anon
    USING (true);

INSERT INTO public.barangays (
    id,
    name,
    municipality,
    province,
    region,
    latitude,
    longitude,
    alert_level,
    total_households
) VALUES (
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid,
    'Banago',
    'Bacolod City',
    'Negros Occidental',
    'Region VI',
    10.7036,
    122.9501,
    'normal',
    0
)
ON CONFLICT (id) DO NOTHING;

-- Sample evacuation asset for map + check-in demos (coordinates near Banago proper).
INSERT INTO public.evacuation_centers (
    id,
    barangay_id,
    name,
    address,
    latitude,
    longitude,
    capacity,
    is_open,
    current_occupancy
) VALUES (
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d002'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid,
    'Banago Multi-Purpose Hall (pilot)',
    'Barangay Banago, Bacolod City, Negros Occidental',
    10.7050,
    122.9515,
    200,
    true,
    0
)
ON CONFLICT (id) DO NOTHING;

-- GeoJSON LineString: coordinates are [longitude, latitude] per RFC 7946.
INSERT INTO public.evacuation_routes (
    id,
    barangay_id,
    center_id,
    name,
    purok_origin,
    route_geojson,
    distance_meters,
    estimated_walk_minutes,
    color_hex
) VALUES (
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d003'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d002'::uuid,
    'Sample route toward pilot center',
    'Tulay',
    '{"type":"LineString","coordinates":[[122.9482,10.7018],[122.9495,10.7030],[122.9502,10.7046],[122.9510,10.7050]]}'::jsonb,
    450,
    6,
    '#1A56C4'
)
ON CONFLICT (id) DO NOTHING;
