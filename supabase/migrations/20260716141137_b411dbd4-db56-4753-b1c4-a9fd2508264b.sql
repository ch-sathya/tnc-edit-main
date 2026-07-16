
-- Tighten profiles SELECT: hide private profiles from others
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by anyone"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (is_public = true OR auth.uid() = user_id);
