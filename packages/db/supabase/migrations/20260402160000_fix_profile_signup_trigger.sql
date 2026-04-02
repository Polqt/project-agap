-- ============================================================
-- Fix resident signup profile trigger
--
-- The original handle_new_user() function inserted avatar_url
-- into public.profiles, but that column does not exist in the
-- current schema. Recreate the trigger function so auth signup
-- can create resident profiles successfully.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    phone_number
  )
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::public.app_role,
      'resident'
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    ),
    COALESCE(NEW.raw_user_meta_data ->> 'phone_number', NULL)
  );
  RETURN NEW;
END;
$$;
