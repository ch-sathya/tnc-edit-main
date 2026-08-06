DO $revoke$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated', r.tablename);
  END LOOP;
END
$revoke$;

-- Anonymous access is read-only and limited to intentionally public content.
GRANT SELECT ON public.profiles, public.projects, public.repositories, public.repository_files,
  public.commits, public.community_groups, public.community_posts, public.post_comments,
  public.post_flairs, public.post_votes, public.group_rules, public.news, public.plan_tiers,
  public.shared_snippets, public.user_experience, public.skill_endorsements,
  public.repository_stars TO anon;
GRANT INSERT ON public.shared_snippets TO anon;

-- Signed-in users receive only the operations used by the application; RLS remains authoritative.
GRANT SELECT, INSERT ON public.activities TO authenticated;
GRANT SELECT, INSERT ON public.ai_chat_history TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.collaboration_code TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaboration_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaboration_rooms TO authenticated;
GRANT SELECT, INSERT ON public.commits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.direct_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_memberships TO authenticated;
GRANT SELECT, INSERT ON public.group_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.news TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pinned_repositories TO authenticated;
GRANT SELECT ON public.plan_tiers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_flairs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.project_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, DELETE ON public.repositories TO authenticated;
GRANT INSERT (id, name, description, user_id, visibility, default_branch, readme_content, tags, star_count, fork_count, created_at, updated_at)
  ON public.repositories TO authenticated;
GRANT UPDATE (name, description, visibility, default_branch, readme_content, tags, star_count, fork_count, updated_at)
  ON public.repositories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repository_files TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.repository_stars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_invitations TO authenticated;
GRANT SELECT, INSERT ON public.room_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_snippets TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.skill_endorsements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_credits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_experience TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;