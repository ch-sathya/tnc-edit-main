GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON public.profiles, public.projects, public.repositories, public.pinned_repositories, public.user_experience, public.skill_endorsements, public.news, public.plan_tiers, public.community_groups, public.community_posts, public.post_comments, public.post_flairs, public.post_votes, public.group_rules, public.group_memberships, public.shared_snippets, public.user_follows, public.user_connections, public.repository_stars, public.activities TO anon;