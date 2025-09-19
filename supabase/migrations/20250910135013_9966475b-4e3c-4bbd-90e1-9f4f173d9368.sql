-- Fix infinite recursion in room_participants RLS policy
-- First, create a security definer function to check room participation
CREATE OR REPLACE FUNCTION public.is_room_participant(check_room_id uuid, check_user_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = check_room_id AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can view participants in rooms they joined" ON public.room_participants;

-- Create new policy without infinite recursion
CREATE POLICY "Users can view participants in rooms they joined" 
ON public.room_participants 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  public.is_room_participant(room_id, auth.uid())
);

-- Also ensure room_participants table has proper RLS enabled
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- Add realtime support for collaboration tables
ALTER TABLE public.room_participants REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.collaboration_code REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_code;