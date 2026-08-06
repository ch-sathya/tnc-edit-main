DO $grants$
DECLARE
  r record;
  cols text;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position)
      INTO cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = r.tablename;
    EXECUTE format('GRANT SELECT (%s) ON public.%I TO authenticated', cols, r.tablename);
  END LOOP;

  FOR r IN
    SELECT unnest(ARRAY[
      'profiles','projects','repositories','repository_files','commits','community_groups',
      'community_posts','post_comments','post_flairs','post_votes','group_rules','news',
      'plan_tiers','shared_snippets','user_experience','skill_endorsements','repository_stars'
    ]) AS tablename
  LOOP
    SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position)
      INTO cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = r.tablename;
    EXECUTE format('GRANT SELECT (%s) ON public.%I TO anon', cols, r.tablename);
  END LOOP;
END
$grants$;