-- Fix infinite recursion in room_participants RLS policy
-- Create a security definer function to check room participation without recursion
CREATE OR REPLACE FUNCTION public.is_room_participant_safe(check_room_id uuid, check_user_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  -- Use a direct query without going through RLS policies
  RETURN EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = check_room_id AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Drop and recreate the problematic policy
DROP POLICY IF EXISTS "Users can view participants in rooms they joined" ON public.room_participants;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Users can view participants in rooms they joined" 
ON public.room_participants 
FOR SELECT 
USING (
  -- Users can see their own participation
  auth.uid() = user_id OR
  -- Users can see other participants in rooms where they are participants
  -- Use the security definer function to avoid recursion
  public.is_room_participant_safe(room_id, auth.uid())
);