-- Persist resident map pin coordinates on profile.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pinned_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pinned_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_pinned_coordinates_pair'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_pinned_coordinates_pair
      CHECK ((pinned_latitude IS NULL) = (pinned_longitude IS NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_pinned_latitude_range'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_pinned_latitude_range
      CHECK (pinned_latitude IS NULL OR pinned_latitude BETWEEN -90 AND 90);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_pinned_longitude_range'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_pinned_longitude_range
      CHECK (pinned_longitude IS NULL OR pinned_longitude BETWEEN -180 AND 180);
  END IF;
END $$;
