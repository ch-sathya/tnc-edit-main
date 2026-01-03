-- Create ownership transfer function for when owner leaves a group
CREATE OR REPLACE FUNCTION public.transfer_group_ownership_on_leave(
  p_group_id UUID,
  p_current_owner UUID
) RETURNS UUID AS $$
DECLARE
  v_new_owner UUID;
BEGIN
  -- Find the next oldest member to transfer ownership to
  SELECT user_id INTO v_new_owner
  FROM public.group_memberships
  WHERE group_id = p_group_id 
    AND user_id != p_current_owner
  ORDER BY joined_at ASC
  LIMIT 1;
  
  IF v_new_owner IS NOT NULL THEN
    -- Update the group's created_by to new owner
    UPDATE public.community_groups 
    SET created_by = v_new_owner, updated_at = now()
    WHERE id = p_group_id;
    
    -- Update membership roles
    UPDATE public.group_memberships 
    SET role = 'owner' 
    WHERE group_id = p_group_id AND user_id = v_new_owner;
  END IF;
  
  RETURN v_new_owner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix RLS policy for group_memberships to allow viewing public group memberships
DROP POLICY IF EXISTS "Group members can view memberships" ON public.group_memberships;

CREATE POLICY "Users can view group memberships"
ON public.group_memberships FOR SELECT
USING (
  -- User is a member of the group
  EXISTS (
    SELECT 1 FROM public.group_memberships gm 
    WHERE gm.group_id = group_memberships.group_id 
    AND gm.user_id = auth.uid()
  )
  -- OR user is checking their own membership status
  OR auth.uid() = user_id
  -- OR the group is public (allow viewing for join/leave status)
  OR EXISTS (
    SELECT 1 FROM public.community_groups cg
    WHERE cg.id = group_memberships.group_id
    AND (cg.is_private = false OR cg.is_private IS NULL)
  )
);