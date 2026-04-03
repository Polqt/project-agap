-- ============================================================
-- Migration: Center Supplies — track relief stock per evacuation center
-- ============================================================

CREATE TABLE public.center_supplies (
    center_id       UUID        PRIMARY KEY REFERENCES public.evacuation_centers(id) ON DELETE CASCADE,
    food_packs      INTEGER     NOT NULL DEFAULT 0 CHECK (food_packs >= 0),
    water_liters    INTEGER     NOT NULL DEFAULT 0 CHECK (water_liters >= 0),
    medicine_units  INTEGER     NOT NULL DEFAULT 0 CHECK (medicine_units >= 0),
    blankets        INTEGER     NOT NULL DEFAULT 0 CHECK (blankets >= 0),
    updated_at      TIMESTAMPTZ          DEFAULT now(),
    updated_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_center_supplies_center ON public.center_supplies(center_id);

-- RLS: officials can read/write their barangay's supplies; residents can read
ALTER TABLE public.center_supplies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "officials_manage_supplies" ON public.center_supplies
    FOR ALL
    USING (
        center_id IN (
            SELECT id FROM public.evacuation_centers
            WHERE barangay_id = (
                SELECT barangay_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "residents_read_supplies" ON public.center_supplies
    FOR SELECT
    USING (true);
