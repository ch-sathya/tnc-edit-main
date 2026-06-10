
-- Extend profiles for Phase 1 identity
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS availability text CHECK (availability IS NULL OR availability IN ('open_to_work','open_to_collab','open_to_hire','not_available')),
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Experience timeline
CREATE TABLE IF NOT EXISTS public.user_experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('work','education','certification')),
  title text NOT NULL,
  organization text,
  location text,
  start_date date,
  end_date date,
  is_current boolean NOT NULL DEFAULT false,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_experience TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_experience TO authenticated;
GRANT ALL ON public.user_experience TO service_role;
ALTER TABLE public.user_experience ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Experience is publicly viewable" ON public.user_experience FOR SELECT USING (true);
CREATE POLICY "Users manage own experience" ON public.user_experience FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_experience_updated_at BEFORE UPDATE ON public.user_experience FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Skill endorsements (skill stored as text matching profiles.skills entries)
CREATE TABLE IF NOT EXISTS public.skill_endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_user_id uuid NOT NULL,
  endorser_id uuid NOT NULL,
  skill text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_user_id, endorser_id, skill),
  CHECK (profile_user_id <> endorser_id)
);
GRANT SELECT ON public.skill_endorsements TO anon;
GRANT SELECT, INSERT, DELETE ON public.skill_endorsements TO authenticated;
GRANT ALL ON public.skill_endorsements TO service_role;
ALTER TABLE public.skill_endorsements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Endorsements are publicly viewable" ON public.skill_endorsements FOR SELECT USING (true);
CREATE POLICY "Authenticated can endorse others" ON public.skill_endorsements FOR INSERT WITH CHECK (auth.uid() = endorser_id);
CREATE POLICY "Endorser can remove own endorsement" ON public.skill_endorsements FOR DELETE USING (auth.uid() = endorser_id);

-- Pinned repositories (max 6 enforced in code; references repositories table)
CREATE TABLE IF NOT EXISTS public.pinned_repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  repository_id uuid NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, repository_id)
);
GRANT SELECT ON public.pinned_repositories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pinned_repositories TO authenticated;
GRANT ALL ON public.pinned_repositories TO service_role;
ALTER TABLE public.pinned_repositories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pins are publicly viewable" ON public.pinned_repositories FOR SELECT USING (true);
CREATE POLICY "Users manage own pins" ON public.pinned_repositories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_experience_user ON public.user_experience(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_endorsements_profile ON public.skill_endorsements(profile_user_id, skill);
CREATE INDEX IF NOT EXISTS idx_pinned_user ON public.pinned_repositories(user_id, sort_order);
