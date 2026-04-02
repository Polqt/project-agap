ALTER TABLE public.households
    ADD COLUMN IF NOT EXISTS welfare_assigned_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS welfare_assigned_at TIMESTAMPTZ;

ALTER TABLE public.households
    DROP CONSTRAINT IF EXISTS households_evacuation_status_check;

ALTER TABLE public.households
    ADD CONSTRAINT households_evacuation_status_check CHECK (
        evacuation_status IN (
            'home',
            'evacuating',
            'checked_in',
            'safe',
            'need_help',
            'unknown',
            'welfare_check_dispatched',
            'not_home'
        )
    );

CREATE INDEX IF NOT EXISTS idx_households_welfare_dispatch
    ON public.households(barangay_id)
    WHERE evacuation_status = 'welfare_check_dispatched';

CREATE POLICY "Officials can read households in their barangay"
    ON public.households
    FOR SELECT
    TO authenticated
    USING (public.is_official_of(barangay_id));

CREATE POLICY "Officials can insert households in their barangay"
    ON public.households
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_official_of(barangay_id));

CREATE POLICY "Officials can update households in their barangay"
    ON public.households
    FOR UPDATE
    TO authenticated
    USING (public.is_official_of(barangay_id));

CREATE POLICY "Officials can insert members in their barangay households"
    ON public.household_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.households h
            WHERE h.id = household_id
              AND public.is_official_of(h.barangay_id)
        )
    );

CREATE POLICY "Officials can update members in their barangay households"
    ON public.household_members
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.households h
            WHERE h.id = household_id
              AND public.is_official_of(h.barangay_id)
        )
    );

CREATE POLICY "Officials can delete members in their barangay households"
    ON public.household_members
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.households h
            WHERE h.id = household_id
              AND public.is_official_of(h.barangay_id)
        )
    );

CREATE OR REPLACE FUNCTION public.get_welfare_dispatch_queue(p_barangay_id UUID)
RETURNS TABLE (
    id UUID,
    barangay_id UUID,
    registered_by UUID,
    household_head TEXT,
    purok TEXT,
    address TEXT,
    phone_number TEXT,
    total_members INTEGER,
    vulnerability_flags public.vulnerability_flag[],
    is_sms_only BOOLEAN,
    evacuation_status TEXT,
    notes TEXT,
    welfare_assigned_profile_id UUID,
    welfare_assigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    assignee_full_name TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        h.id,
        h.barangay_id,
        h.registered_by,
        h.household_head,
        h.purok,
        h.address,
        h.phone_number,
        h.total_members,
        h.vulnerability_flags,
        h.is_sms_only,
        h.evacuation_status::TEXT,
        h.notes,
        h.welfare_assigned_profile_id,
        h.welfare_assigned_at,
        h.created_at,
        h.updated_at,
        p.full_name AS assignee_full_name
    FROM public.households h
    LEFT JOIN public.profiles p ON p.id = h.welfare_assigned_profile_id
    WHERE h.barangay_id = p_barangay_id
      AND h.evacuation_status = 'welfare_check_dispatched'
    ORDER BY h.welfare_assigned_at ASC NULLS LAST, h.household_head ASC;
$$;

REVOKE ALL ON FUNCTION public.get_welfare_dispatch_queue(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_welfare_dispatch_queue(UUID) TO authenticated;
