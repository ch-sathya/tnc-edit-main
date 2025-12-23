-- Fix the role column (reset it to text if needed)
ALTER TABLE public.group_memberships 
  ALTER COLUMN role SET DEFAULT 'member';

-- Ensure role column is text (may already be)
DO $$ 
BEGIN
  -- Update existing null roles to member
  UPDATE public.group_memberships SET role = 'member' WHERE role IS NULL;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors
  NULL;
END $$;

-- Recreate the users can leave groups policy if it was dropped
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_memberships;
CREATE POLICY "Users can leave groups"
ON public.group_memberships
FOR DELETE
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 FROM public.group_memberships gm
    WHERE gm.group_id = group_memberships.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'owner'
  ))
);

-- Create security definer function to check group roles (avoids RLS recursion)
-- Uses text comparison instead of enum for simplicity
CREATE OR REPLACE FUNCTION public.has_group_role(
  _group_id uuid, 
  _user_id uuid, 
  _roles text[]
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = _group_id 
    AND user_id = _user_id 
    AND role = ANY(_roles)
  )
$$;

-- Create function to get user's role in a group
CREATE OR REPLACE FUNCTION public.get_user_group_role(
  _group_id uuid,
  _user_id uuid
) RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.group_memberships
  WHERE group_id = _group_id AND user_id = _user_id
  LIMIT 1
$$;

-- Create RLS policy for role management (only owners/admins can update roles)
DROP POLICY IF EXISTS "Owners and admins can update member roles" ON public.group_memberships;
CREATE POLICY "Owners and admins can update member roles"
ON public.group_memberships
FOR UPDATE
USING (
  public.has_group_role(group_id, auth.uid(), ARRAY['owner', 'admin'])
)
WITH CHECK (
  public.has_group_role(group_id, auth.uid(), ARRAY['owner', 'admin'])
);