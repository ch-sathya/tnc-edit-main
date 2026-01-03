-- Fix infinite recursion in group_memberships SELECT policy by using a SECURITY DEFINER helper

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_memberships
    WHERE group_id = _group_id
      AND user_id = _user_id
  );
$$;

-- Replace the recursive policy
DROP POLICY IF EXISTS "Users can view group memberships" ON public.group_memberships;

CREATE POLICY "Users can view group memberships"
ON public.group_memberships
FOR SELECT
USING (
  -- A user can always see their own membership row
  auth.uid() = user_id

  -- Authenticated users can view memberships in public groups (needed for member counts / member lists)
  OR (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.community_groups cg
      WHERE cg.id = group_memberships.group_id
        AND (cg.is_private = false OR cg.is_private IS NULL)
    )
  )

  -- Members of a group can view other memberships for that group
  OR (
    auth.uid() IS NOT NULL
    AND public.is_group_member(group_memberships.group_id, auth.uid())
  )
);