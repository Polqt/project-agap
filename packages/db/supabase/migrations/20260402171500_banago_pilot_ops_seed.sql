-- Banago pilot ops expansion.
--
-- Sources used for the pilot geography:
-- - PhilAtlas Banago profile for coordinates, households, and official sitos:
--   https://www.philatlas.com/visayas/r06/bacolod/banago.html
-- - Bacolod City CLUP / public references for Banago civic landmarks such as
--   Banago Barangay Hall, the Philippine Coast Guard building, and San Mateo Village Church.
--
-- Important: a fully verified public purok masterlist for Banago was not available
-- from primary sources during this seed pass, so the operational targeting buckets
-- below use the official sitos (Barangay Proper, Sibucao, San Patricio) as the
-- stable subdivision labels for the pilot.

UPDATE public.profiles
SET
    barangay_id = 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid,
    purok = COALESCE(purok, 'Barangay Proper')
WHERE role = 'official'
  AND barangay_id IS NULL;

INSERT INTO public.evacuation_centers (
    id,
    barangay_id,
    name,
    address,
    latitude,
    longitude,
    capacity,
    is_open,
    current_occupancy,
    notes
) VALUES
(
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d011'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid,
    'Avelino B. Torrecampo Memorial Hall',
    'Banago Barangay Hall, Banago, Bacolod City',
    10.7042,
    122.9511,
    180,
    true,
    0,
    'Pilot civic shelter point based on public Banago barangay hall references. Verify final DRRM assignment on deployment.'
),
(
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d012'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid,
    'San Mateo Village Church',
    'San Mateo area, Banago, Bacolod City',
    10.7061,
    122.9494,
    140,
    true,
    0,
    'Pilot shelter point based on public Banago planning references. Verify final DRRM assignment on deployment.'
),
(
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d013'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid,
    'Philippine Coast Guard Building - Banago',
    'Coastal Banago, Bacolod City',
    10.7073,
    122.9478,
    120,
    true,
    0,
    'Pilot coastal shelter point based on public Banago planning references. Verify final DRRM assignment on deployment.'
)
ON CONFLICT (id) DO UPDATE
SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    capacity = EXCLUDED.capacity,
    is_open = EXCLUDED.is_open,
    notes = EXCLUDED.notes;

UPDATE public.evacuation_routes
SET purok_origin = 'Barangay Proper'
WHERE id = 'c0ffee00-baaa-4aaa-8aaa-0000bac0d003'::uuid;

INSERT INTO public.evacuation_routes (
    id,
    barangay_id,
    center_id,
    name,
    purok_origin,
    route_geojson,
    distance_meters,
    estimated_walk_minutes,
    color_hex,
    notes
) VALUES
(
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d021'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d011'::uuid,
    'Barangay Proper to Torrecampo Hall',
    'Barangay Proper',
    '{"type":"LineString","coordinates":[[122.9491,10.7030],[122.9500,10.7035],[122.9511,10.7042]]}'::jsonb,
    360,
    5,
    '#2563EB',
    'Pilot routing path only.'
),
(
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d022'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d012'::uuid,
    'Sibucao to San Mateo Village Church',
    'Sibucao',
    '{"type":"LineString","coordinates":[[122.9481,10.7068],[122.9488,10.7064],[122.9494,10.7061]]}'::jsonb,
    280,
    4,
    '#0F766E',
    'Pilot routing path only.'
),
(
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d023'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d013'::uuid,
    'San Patricio to Coast Guard Building',
    'San Patricio',
    '{"type":"LineString","coordinates":[[122.9499,10.7071],[122.9487,10.7073],[122.9478,10.7073]]}'::jsonb,
    410,
    6,
    '#DC2626',
    'Pilot routing path only.'
)
ON CONFLICT (id) DO UPDATE
SET
    center_id = EXCLUDED.center_id,
    name = EXCLUDED.name,
    purok_origin = EXCLUDED.purok_origin,
    route_geojson = EXCLUDED.route_geojson,
    distance_meters = EXCLUDED.distance_meters,
    estimated_walk_minutes = EXCLUDED.estimated_walk_minutes,
    color_hex = EXCLUDED.color_hex,
    notes = EXCLUDED.notes;

INSERT INTO public.households (
    id,
    barangay_id,
    registered_by,
    household_head,
    purok,
    address,
    phone_number,
    total_members,
    vulnerability_flags,
    is_sms_only,
    evacuation_status,
    notes
) VALUES
('c0ffee00-baaa-4aaa-8aaa-0000bac0d201'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Maria L. Dela Cruz', 'Barangay Proper', 'Riverside Alley 1, Banago', '09170001001', 5, ARRAY['elderly']::public.vulnerability_flag[], false, 'unknown', 'Needs manual follow-up after evening rounds.'),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d202'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Arturo S. Ramos', 'Barangay Proper', 'Near Barangay Hall, Banago', '09170001002', 4, ARRAY[]::public.vulnerability_flag[], false, 'checked_in', NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d203'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Teresa V. Gomez', 'Barangay Proper', 'Interior Road 2, Banago', '09170001003', 6, ARRAY['pwd','pregnant']::public.vulnerability_flag[], true, 'need_help', 'Household requested medicine and transport support.'),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d204'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Noel P. Lopez', 'Barangay Proper', 'Coastal Road Spur, Banago', '09170001004', 3, ARRAY[]::public.vulnerability_flag[], false, 'safe', NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d205'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Fe R. Villanueva', 'Barangay Proper', 'Hall Access Road, Banago', '09170001005', 7, ARRAY['elderly','infant']::public.vulnerability_flag[], false, 'welfare_check_dispatched', 'Field team assigned for welfare visit.'),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d206'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Rogelio A. Tan', 'Barangay Proper', 'Pier Approach, Banago', '09170001006', 2, ARRAY[]::public.vulnerability_flag[], true, 'home', NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d207'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Elena B. Magbanua', 'Sibucao', 'Sibucao Main Road, Banago', '09170001007', 5, ARRAY['pregnant']::public.vulnerability_flag[], false, 'unknown', NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d208'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Jose Mari M. Cortez', 'Sibucao', 'Sitio Sibucao Interior 3', '09170001008', 4, ARRAY['pwd']::public.vulnerability_flag[], false, 'need_help', 'Wheelchair access needed for transfer.'),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d209'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Liza C. Torres', 'Sibucao', 'Sibucao Creekside, Banago', '09170001009', 3, ARRAY[]::public.vulnerability_flag[], false, 'safe', NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d210'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Wilfredo P. Salazar', 'Sibucao', 'Sibucao Block 4, Banago', '09170001010', 6, ARRAY['elderly']::public.vulnerability_flag[], true, 'home', NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d211'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Ana Mae D. Flores', 'Sibucao', 'Near San Mateo path, Banago', '09170001011', 4, ARRAY['infant']::public.vulnerability_flag[], false, 'checked_in', NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d212'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Ramon T. Guanzon', 'Sibucao', 'Sibucao North Lane, Banago', '09170001012', 5, ARRAY['pwd','elderly']::public.vulnerability_flag[], false, 'welfare_check_dispatched', 'Follow-up after relief distribution.'),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d213'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Julieta A. Navarro', 'San Patricio', 'San Patricio Boulevard East', '09170001013', 5, ARRAY['pregnant']::public.vulnerability_flag[], false, 'unknown', NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d214'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Renato S. Yulo', 'San Patricio', 'Racahe Wharf frontage, Banago', '09170001014', 3, ARRAY[]::public.vulnerability_flag[], false, 'safe', NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d215'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Maribel C. Fernandez', 'San Patricio', 'San Patricio South Lane', '09170001015', 6, ARRAY['infant']::public.vulnerability_flag[], true, 'home', 'SMS-only household.'),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d216'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Ernesto T. Aquino', 'San Patricio', 'Near Coast Guard access road', '09170001016', 4, ARRAY['elderly']::public.vulnerability_flag[], false, 'need_help', 'Requested transport to evacuation center.'),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d217'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Hazel M. Villareal', 'San Patricio', 'San Patricio Inner Street 5', '09170001017', 5, ARRAY[]::public.vulnerability_flag[], false, 'checked_in', NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d218'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d001'::uuid, NULL, 'Danilo P. Cabarles', 'San Patricio', 'Coastal Housing Strip, Banago', '09170001018', 7, ARRAY['pwd','pregnant']::public.vulnerability_flag[], false, 'unknown', 'Household flagged during overnight monitoring.')
ON CONFLICT (id) DO UPDATE
SET
    household_head = EXCLUDED.household_head,
    purok = EXCLUDED.purok,
    address = EXCLUDED.address,
    phone_number = EXCLUDED.phone_number,
    total_members = EXCLUDED.total_members,
    vulnerability_flags = EXCLUDED.vulnerability_flags,
    is_sms_only = EXCLUDED.is_sms_only,
    evacuation_status = EXCLUDED.evacuation_status,
    notes = EXCLUDED.notes;

DELETE FROM public.household_members
WHERE household_id IN (
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d201'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d202'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d203'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d204'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d205'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d206'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d207'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d208'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d209'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d210'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d211'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d212'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d213'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d214'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d215'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d216'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d217'::uuid,
    'c0ffee00-baaa-4aaa-8aaa-0000bac0d218'::uuid
);

INSERT INTO public.household_members (
    id,
    household_id,
    full_name,
    age,
    vulnerability_flags,
    notes
) VALUES
('c0ffee00-baaa-4aaa-8aaa-0000bac0d301'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d201'::uuid, 'Rafael Dela Cruz', 67, ARRAY['elderly']::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d302'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d201'::uuid, 'Angela Dela Cruz', 12, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d303'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d202'::uuid, 'Mika Ramos', 15, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d304'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d202'::uuid, 'Leo Ramos', 9, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d305'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d203'::uuid, 'Marlon Gomez', 34, ARRAY['pwd']::public.vulnerability_flag[], 'Maintenance medicine required'),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d306'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d203'::uuid, 'Shane Gomez', 6, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d307'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d204'::uuid, 'Nina Lopez', 24, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d308'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d204'::uuid, 'Joel Lopez', 18, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d309'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d205'::uuid, 'Corazon Villanueva', 71, ARRAY['elderly']::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d310'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d205'::uuid, 'Baby Villanueva', 1, ARRAY['infant']::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d311'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d206'::uuid, 'Dante Tan', 19, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d312'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d206'::uuid, 'Gina Tan', 17, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d313'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d207'::uuid, 'Paolo Magbanua', 28, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d314'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d207'::uuid, 'Mikaela Magbanua', 4, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d315'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d208'::uuid, 'Jonel Cortez', 38, ARRAY['pwd']::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d316'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d208'::uuid, 'Loren Cortez', 13, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d317'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d209'::uuid, 'Joan Torres', 21, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d318'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d209'::uuid, 'Mara Torres', 8, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d319'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d210'::uuid, 'Elpidio Salazar', 69, ARRAY['elderly']::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d320'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d210'::uuid, 'Rica Salazar', 11, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d321'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d211'::uuid, 'Nico Flores', 1, ARRAY['infant']::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d322'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d211'::uuid, 'Rose Flores', 27, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d323'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d212'::uuid, 'Cesar Guanzon', 73, ARRAY['elderly']::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d324'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d212'::uuid, 'Mylene Guanzon', 42, ARRAY['pwd']::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d325'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d213'::uuid, 'Kurt Navarro', 26, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d326'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d213'::uuid, 'Ariane Navarro', 2, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d327'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d214'::uuid, 'Mia Yulo', 14, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d328'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d214'::uuid, 'Renz Yulo', 10, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d329'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d215'::uuid, 'Bianca Fernandez', 7, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d330'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d215'::uuid, 'Paolo Fernandez', 4, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d331'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d216'::uuid, 'Estela Aquino', 66, ARRAY['elderly']::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d332'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d216'::uuid, 'Jared Aquino', 16, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d333'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d217'::uuid, 'Lance Villareal', 18, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d334'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d217'::uuid, 'Mavi Villareal', 9, ARRAY[]::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d335'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d218'::uuid, 'Carla Cabarles', 33, ARRAY['pregnant']::public.vulnerability_flag[], NULL),
('c0ffee00-baaa-4aaa-8aaa-0000bac0d336'::uuid, 'c0ffee00-baaa-4aaa-8aaa-0000bac0d218'::uuid, 'Dwayne Cabarles', 12, ARRAY[]::public.vulnerability_flag[], NULL);
