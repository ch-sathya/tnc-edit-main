
-- =====================================================================
-- SECURITY FIXES
-- =====================================================================

-- 1) community_groups: hide private groups from non-members
DROP POLICY IF EXISTS "Anyone can view groups" ON public.community_groups;
CREATE POLICY "View public groups or member groups"
ON public.community_groups
FOR SELECT
USING (
  is_private = false
  OR auth.uid() = created_by
  OR public.is_group_member(id, auth.uid())
);

-- 2) group_rules: hide private group rules from non-members
DROP POLICY IF EXISTS "Anyone can view group rules" ON public.group_rules;
CREATE POLICY "View rules for public groups or member groups"
ON public.group_rules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_groups g
    WHERE g.id = group_rules.group_id
      AND (
        g.is_private = false
        OR g.created_by = auth.uid()
        OR public.is_group_member(g.id, auth.uid())
      )
  )
);

-- 3) room_invitations: remove permissive UPDATE policy; restrict to owners
DROP POLICY IF EXISTS "Room invitations can be updated for usage tracking" ON public.room_invitations;
CREATE POLICY "Only room owners can update invitations"
ON public.room_invitations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.collaboration_rooms r
    WHERE r.id = room_invitations.room_id AND r.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.collaboration_rooms r
    WHERE r.id = room_invitations.room_id AND r.created_by = auth.uid()
  )
);
-- Note: usage counter is incremented inside SECURITY DEFINER function
-- public.join_room_with_invite_code, which bypasses this policy safely.

-- 4) Fix function search_path (update_repository_star_count was missing SET)
CREATE OR REPLACE FUNCTION public.update_repository_star_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.repositories SET star_count = star_count + 1 WHERE id = NEW.repository_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.repositories SET star_count = star_count - 1 WHERE id = OLD.repository_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- 5) Lock down SECURITY DEFINER functions: revoke EXECUTE from PUBLIC/anon
--    Only grant EXECUTE to the roles that actually need to call each function.

-- Trigger-only functions: no user should call directly
REVOKE ALL ON FUNCTION public.update_repository_star_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_group_member_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_add_group_creator() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_community_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_credits() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_post_vote_counts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_post_comment_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Server-only / admin functions
REVOKE ALL ON FUNCTION public.create_system_notification(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transfer_group_ownership_on_leave(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- RLS helpers and user RPCs: revoke from PUBLIC and anon, grant only authenticated
REVOKE ALL ON FUNCTION public.is_room_participant_safe(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_room_participant_safe(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.has_group_role(uuid, uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_group_role(uuid, uuid, text[]) TO authenticated;

REVOKE ALL ON FUNCTION public.get_user_group_role(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_group_role(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.increment_snippet_view_count(varchar) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_snippet_view_count(varchar) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.validate_and_use_invite_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_and_use_invite_code(text) TO authenticated;

REVOKE ALL ON FUNCTION public.join_room_with_invite_code(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_room_with_invite_code(text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_file_latest_version(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_file_latest_version(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.apply_file_changes(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_file_changes(uuid, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_pending_changes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pending_changes(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.update_session_activity(uuid, uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_session_activity(uuid, uuid, uuid, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_user_account_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account_data(uuid) TO authenticated;

-- 6) Block GraphQL introspection/exposure (project uses PostgREST, not GraphQL)
REVOKE USAGE ON SCHEMA graphql FROM anon, authenticated;
REVOKE USAGE ON SCHEMA graphql_public FROM anon, authenticated;

-- 7) Storage: remove broad SELECT policies that let clients list bucket contents.
--    Public buckets still serve files via public URLs (which bypass RLS),
--    so direct <img src> access continues to work.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Project images are publicly accessible" ON storage.objects;
