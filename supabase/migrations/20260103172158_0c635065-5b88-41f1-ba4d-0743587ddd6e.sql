-- Fix potential recursion in group_memberships DELETE policy by using the existing SECURITY DEFINER function

DROP POLICY IF EXISTS "Users can leave groups" ON public.group_memberships;

CREATE POLICY "Users can leave groups"
ON public.group_memberships
FOR DELETE
USING (
  auth.uid() = user_id
  OR public.has_group_role(group_id, auth.uid(), ARRAY['owner'::text])
);
