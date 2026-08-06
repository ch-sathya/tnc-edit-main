CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated, service_role;

DO $move$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET SCHEMA app_private', fn.signature);
  END LOOP;
END
$move$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_private TO service_role;

-- RLS helpers remain callable by policies but are no longer exposed as public API RPCs.
GRANT EXECUTE ON FUNCTION app_private.get_user_group_role(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_group_role(uuid, uuid, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_group_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_room_participant_safe(uuid, uuid) TO anon, authenticated;

-- Public API wrappers execute with caller privileges and delegate only to reviewed private routines.
CREATE FUNCTION public.delete_user_account_data(target_user_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog
AS $$ SELECT app_private.delete_user_account_data(target_user_id) $$;
GRANT EXECUTE ON FUNCTION app_private.delete_user_account_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account_data(uuid) TO authenticated, service_role;

CREATE FUNCTION public.increment_snippet_view_count(snippet_code varchar)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog
AS $$ SELECT app_private.increment_snippet_view_count(snippet_code) $$;
GRANT EXECUTE ON FUNCTION app_private.increment_snippet_view_count(varchar) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_snippet_view_count(varchar) TO anon, authenticated, service_role;

CREATE FUNCTION public.validate_and_use_invite_code(invite_code_input text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog
AS $$ SELECT app_private.validate_and_use_invite_code(invite_code_input) $$;
GRANT EXECUTE ON FUNCTION app_private.validate_and_use_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_and_use_invite_code(text) TO authenticated, service_role;

CREATE FUNCTION public.join_room_with_invite_code(invite_code_input text, joining_user_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog
AS $$ SELECT app_private.join_room_with_invite_code(invite_code_input, joining_user_id) $$;
GRANT EXECUTE ON FUNCTION app_private.join_room_with_invite_code(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room_with_invite_code(text, uuid) TO authenticated, service_role;

CREATE FUNCTION public.transfer_group_ownership_on_leave(p_group_id uuid, p_current_owner uuid)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog
AS $$ SELECT app_private.transfer_group_ownership_on_leave(p_group_id, p_current_owner) $$;
GRANT EXECUTE ON FUNCTION app_private.transfer_group_ownership_on_leave(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_group_ownership_on_leave(uuid, uuid) TO authenticated, service_role;

-- Remove GraphQL schema discovery for client roles; PostgREST/RLS access is unchanged.
REVOKE USAGE ON SCHEMA graphql, graphql_public FROM anon, authenticated;

-- Remove the permissive upload rule; retain the existing owner-folder rule.
DROP POLICY IF EXISTS "Users can upload project images" ON storage.objects;

-- Owners may edit normal repository fields, but never the admin override.
REVOKE INSERT, UPDATE ON public.repositories FROM anon, authenticated;
GRANT INSERT (id, name, description, user_id, visibility, default_branch, readme_content, tags, star_count, fork_count, created_at, updated_at)
  ON public.repositories TO authenticated;
GRANT UPDATE (name, description, visibility, default_branch, readme_content, tags, star_count, fork_count, updated_at)
  ON public.repositories TO authenticated;

DROP POLICY IF EXISTS "Users can view their own connection requests and accepted conne" ON public.user_connections;
CREATE POLICY "Users can view their own connections"
ON public.user_connections
FOR SELECT
TO authenticated
USING (requester_id = auth.uid() OR addressee_id = auth.uid());