-- ============================================================
-- Migration 0007: Row Level Security Policies
--
-- Strategy:
--   residents  → read/write their own data + read barangay data
--   officials  → full read/write within their assigned barangay
--   anon       → read-only on alerts (for public alert display)
--   service    → bypasses RLS (used by Edge Functions)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_barangay()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT barangay_id
  FROM public.profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_official_of(bid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'official'
          AND barangay_id = bid
    );
$$;

-- Enable RLS on all tables 

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barangays           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evacuation_centers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evacuation_routes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_pings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.needs_reports       ENABLE ROW LEVEL SECURITY;

-- profiles 

CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Officials can read profiles in their barangay"
    ON public.profiles
    FOR SELECT
    USING (
        public.is_official_of(barangay_id)
    );

-- barangays

CREATE POLICY "Authenticated users can read barangays"
    ON public.barangays
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Officials can update their own barangay"
    ON public.barangays
    FOR UPDATED
    USING (
        public.is_official_of(id)
    );

-- evacuation_centers

CREATE POLICY "Authenticated users can read evacuation centers"
    ON public.evacuation_centers
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Officials can manage centers in their barangay"
    ON public.evacuation_centers
    FOR ALL
    USING (
        public.is_official_of(barangay_id)
    );

-- evacuation_routes

CREATE POLICY "Authenticated users can read evacuation routes"
    ON public.evacuation_routes
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Officials can manage routes in their barangay"
    ON public.evacuation_routes
    FOR ALL
    USING (
        public.is_official_of(barangay_id)
    );

-- households

CREATE POLICY "Residents can read households in their barangay"
    ON public.households
    FOR SELECT
    USING (
        barangay_id = public.get_my_barangay()
    );

CREATE POLICY "Residents can create and update their own household"
    ON public.households
    FOR INSERT
    WITH CHECK (
        barangay_id = public.get_my_barangay()
        AND registered_by = auth.uid()
    );

CREATE POLICY "Residents can update their own household"
    ON public.households
    FOR UPDATE
    USING (
        registered_by = auth.uid()
    );

-- household_members
CREATE POLICY "Residents can manage their own household members"
    ON public.household_members
    FOR ALL
    USING (
        household_id IN (
            SELECT id FROM public.households
            WHERE registered_by = auth.uid()
        )
    );

CREATE POLICY "Officials can read all members in their barangay"
    ON public.household_members
    FOR SELECT
    USING (
        household_id IN (
            SELECT id FROM public.households
            WHERE barangay_id = public.get_my_barangay()
                AND public.is_official_of(barangay_id)
        )
    );

-- check_ins

CREATE POLICY "Residents can insert their own check-ins"
    ON public.check_ins
    FOR INSERT
    WITH CHECK (
        barangay_id = public.get_my_barangay()
        AND (resident_id = auth.uid() OR resident_id IS NULL)
    );

CREATE POLICY "Residents can read their own check-ins"
    ON public.check_ins 
    FOR SELECT
    USING (resident_id = auth.uid());

CREATE POLICY "Officials can read all check-ins in their barangay"
    ON public.check_ins
    FOR SELECT
    USING (
        public.is_official_of(barangay_id)
    );

-- status_pings

CREATE POLICY "Residents can insert their own pings"
    ON public.status_pings 
    FOR INSERT
    WITH CHECK (
        barangay_id = public.get_my_barangay()
        AND (resident_id = auth.uid() OR resident_id IS NULL)
    );

CREATE POLICY "Residents can read their own pings"
    ON public.status_pings 
    FOR SELECT
    USING (resident_id = auth.uid());

CREATE POLICY "Officials can read and resolve pings in their barangay"
    ON public.status_pings
    FOR ALL
    USING (
        public.is_official_of(barangay_id)
    );

-- push_tokens

CREATE POLICY "Residents can manage their own push tokens"
    ON public.push_tokens
    FOR ALL
    USING (resident_id = auth.uid());

-- alerts

CREATE POLICY "Anone can read active alerts"
    ON public.alerts
    FOR SELECT
    USING (
        is_active = true
    );

CREATE POLICY "Officials can insert manual alerts for their barangay"
    ON public.alerts
    FOR INSERT
    WITH CHECK (
        source = 'manual'
        AND public.is_official_of(barangay_id)
    );

-- broadcasts

CREATE POLICY "Residents can read broadcasts in their barangay"
    ON public.broadcasts
    FOR SELECT
    USING (
        barangay_id = public.get_my_barangay()
    );

CREATE POLICY "Officials can create broadcasts for their barangay"
    ON public.broadcasts
    FOR INSERT
    WITH CHECK (
        barangay_id = public.get_my_barangay()
        AND sent_by = auth.uid()
    );

-- sms_logs
-- Only officials and service role can read SMS logs.
-- Edge Functions write via service role (bypasses RLS).

CREATE POLICY "Officials can read SMS logs in their barangay"
    ON public.sms_logs
    FOR SELECT
    USING (
        public.is_official_of(barangay_id)
    );

-- needs_reports

CREATE POLICY "Officials can manage needs reports in their barangay"
    ON public.needs_reports
    FOR ALL
    USING (
        public.is_official_of(barangay_id)
    );