-- user_experience / skill_endorsements / pinned_repositories: only public profiles or owner
DROP POLICY IF EXISTS "Experience is publicly viewable" ON public.user_experience;
CREATE POLICY "Experience visible for public profiles or owner" ON public.user_experience FOR SELECT
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = user_experience.user_id AND p.is_public));

DROP POLICY IF EXISTS "Endorsements are publicly viewable" ON public.skill_endorsements;
CREATE POLICY "Endorsements visible for public profiles or participants" ON public.skill_endorsements FOR SELECT
USING (auth.uid() IN (profile_user_id, endorser_id) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = skill_endorsements.profile_user_id AND p.is_public));

DROP POLICY IF EXISTS "Pins are publicly viewable" ON public.pinned_repositories;
CREATE POLICY "Pins visible for public profiles or owner" ON public.pinned_repositories FOR SELECT
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = pinned_repositories.user_id AND p.is_public));

-- post_votes: users see only their own votes (totals live on posts/comments)
DROP POLICY IF EXISTS "Anyone can view votes" ON public.post_votes;
CREATE POLICY "Users view own votes" ON public.post_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- shared_snippets: signed-in users only, tied to creator, size limits
ALTER TABLE public.shared_snippets ALTER COLUMN created_by SET DEFAULT auth.uid();
DROP POLICY IF EXISTS "Anyone can create shared snippets" ON public.shared_snippets;
CREATE POLICY "Signed-in users create own snippets" ON public.shared_snippets FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND length(code) <= 100000 AND coalesce(length(input),0) <= 20000);